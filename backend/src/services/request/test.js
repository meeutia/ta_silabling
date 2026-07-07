createRequest = async (userNik, { customer, request, samples }) => {
    return sequelize.transaction(async transaction => {
        this.validateSamples(samples);

        const pelanggan = await this.saveCustomer(
            userNik,
            customer,
            transaction
        );

        const idRegistrasi = await this.createRequestHeader(
            pelanggan.id_pelanggan,
            request,
            transaction
        );

        await this.logRequestCreation(
            idRegistrasi,
            userNik,
            transaction
        );

        const createdParameterCount = await this.saveRequestSamples(
            idRegistrasi,
            samples,
            transaction
        );

        await this.validateCompositionPersisted({
            id_registrasi: idRegistrasi,
            expectedSampelCount: samples.length,
            expectedParameterCount: createdParameterCount,
            transaction
        });

        return {
            idRegistrasi,
            status: RequestStatus.WAITING_VERIFICATION
        };
    });
};

saveCustomer = async (userNik, customer, transaction) => {
    const {
        idPelanggan,
        namaInstansi,
        pic,
        emailPic,
        noTelp,
        alamat
    } = customer;

    const customerValues = {
        nama_instansi: namaInstansi,
        pic,
        email_kontak: emailPic,
        no_telp: noTelp,
        alamat
    };

    if (idPelanggan) {
        const pelanggan = await Pelanggan.findOne({
            where: {
                id_pelanggan: idPelanggan,
                nik: userNik
            },
            transaction
        });

        if (!pelanggan) {
            throw new Error(
                'Data pelanggan yang dipilih tidak ditemukan atau tidak valid.'
            );
        }

        await pelanggan.update(customerValues, { transaction });
        return pelanggan;
    }

    const newIdPelanggan = await generateId(
        Pelanggan,
        'id_pelanggan',
        'PL-'
    );

    return Pelanggan.create(
        {
            id_pelanggan: newIdPelanggan,
            nik: userNik,
            ...customerValues
        },
        { transaction }
    );
};

createRequestHeader = async (
    idPelanggan,
    request,
    transaction
) => {
    const {
        maksudPengujian,
        maksudLainnya,
        metodePengambilan
    } = request;

    const finalTestPurpose = this.resolveTestPurpose(
        maksudPengujian,
        maksudLainnya
    );

    const samplingType = resolveSamplingType(metodePengambilan);
    const samplingSchedule = resolveSamplingSchedule(request);
    const samplingLocation = resolveSamplingLocation(request);

    const idRegistrasi = await generateId(
        Fppl,
        'id_registrasi',
        'REG-'
    );

    await Fppl.create(
        {
            id_registrasi: idRegistrasi,
            id_pelanggan: idPelanggan,
            tanggal_pendaftaran: new Date(),
            maksud_pengujian: finalTestPurpose,
            lokasi_pengambilan_sampel: samplingLocation,
            jenis_pengambilan_sampel: samplingType,
            tanggal_rencana_pengambilan_sampel:
                samplingSchedule.tanggalRencanaPengambilanSampel,
            jam_rencana_pengambilan_sampel:
                samplingSchedule.jamRencanaPengambilanSampel,
            tanggal_rencana_pengantaran_sampel:
                samplingSchedule.tanggalRencanaPengantaranSampel,
            status_fppl: RequestStatus.WAITING_VERIFICATION
        },
        { transaction }
    );

    return idRegistrasi;
};

saveRequestSamples = async (
    idRegistrasi,
    samples,
    transaction
) => {
    let parameterCounter = 1;

    for (const [sampleIndex, sample] of samples.entries()) {
        const {
            idJenisSampel,
            idRegBm,
            parameterIds
        } = sample;

        await FpplSampel.create(
            {
                id_registrasi: idRegistrasi,
                id_jenis_sampel: idJenisSampel,
                id_reg_bm: idRegBm,
                jumlah_sampel: resolveSampleQuantity(sample)
            },
            { transaction }
        );

        for (const idParameter of parameterIds) {
            const idFpm = this.generateRequestParameterId({
                idRegistrasi,
                sampleNumber: sampleIndex + 1,
                parameterNumber: parameterCounter
            });

            await FpplParameterMetode.create(
                {
                    id_fppl_parameter_metode: idFpm,
                    id_registrasi: idRegistrasi,
                    id_jenis_sampel: idJenisSampel,
                    id_reg_bm: idRegBm,
                    id_parameter: idParameter,
                    id_metode_parameter: null,
                    status_kemampuan_lab: 'MAMPU',
                    catatan_kemampuan: null,
                    is_insitu: 0
                },
                { transaction }
            );

            parameterCounter++;
        }
    }

    return parameterCounter - 1;
};

validateSamples = samples => {
    if (!Array.isArray(samples) || samples.length === 0) {
        throw new Error(
            'Data sampel dan parameter uji wajib diisi.'
        );
    }

    for (const sample of samples) {
        const hasValidParameters =
            Array.isArray(sample.parameterIds) &&
            sample.parameterIds.length > 0;

        if (
            !sample.idJenisSampel ||
            !sample.idRegBm ||
            !hasValidParameters
        ) {
            throw new Error(
                'Setiap sampel wajib memiliki jenis sampel, standar, dan parameter.'
            );
        }
    }
};

resolveTestPurpose = (maksudPengujian, maksudLainnya) => {
    const purpose = String(maksudPengujian || '').trim();
    const isOtherPurpose = purpose.toLowerCase() === 'lainnya';

    const finalPurpose = String(
        isOtherPurpose ? maksudLainnya : purpose
    ).trim();

    if (!finalPurpose) {
        throw new Error('Maksud pengujian wajib diisi.');
    }

    return finalPurpose;
};

generateRequestParameterId = ({
    idRegistrasi,
    sampleNumber,
    parameterNumber
}) => {
    const registrationNumber = idRegistrasi.replace('REG-', '');

    return [
        'FPM',
        registrationNumber,
        String(sampleNumber).padStart(2, '0'),
        String(parameterNumber).padStart(2, '0')
    ].join('-');
};

logRequestCreation = async (
    idRegistrasi,
    userNik,
    transaction
) => {
    await WorkflowLogService.logStatusTransition({
        entityType: 'FPPL',
        entityId: idRegistrasi,
        action: 'MEMBUAT_PERMOHONAN',
        statusBefore: null,
        statusAfter: RequestStatus.WAITING_VERIFICATION,
        source: 'Pelanggan',
        note: 'Permohonan dibuat oleh pelanggan.',
        actorNik: userNik,
        transaction
    });
};


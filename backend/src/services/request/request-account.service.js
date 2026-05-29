const { Pelanggan, Pegawai, User } = require('../../models/Associations');
const Roles = require('../../constants/roles');

const getAnalystOptions = async () => {
    const users = await User.findAll({
        where: {
            id_role: Roles.ANALIS,
            is_active: 1
        },
        attributes: ['nik', 'username', 'email'],
        include: [
            {
                model: Pegawai,
                attributes: ['id_pegawai', 'nama_pegawai', 'no_wa'],
                required: false
            }
        ],
        order: [['username', 'ASC']]
    });

    return users.map((user) => ({
        nik: user.nik,
        username: user.username,
        email: user.email,
        nama_analis: user?.pegawai?.nama_pegawai || user?.Pegawai?.nama_pegawai || user.username,
        no_wa: user?.pegawai?.no_wa || user?.Pegawai?.no_wa || null,
        id_pegawai: user?.pegawai?.id_pegawai || user?.Pegawai?.id_pegawai || null
    }));
};


const getMyPelanggans = async (userNik) => {
        return await Pelanggan.findAll({
            where: { nik: userNik },
            order: [['id_pelanggan', 'DESC']]
        });
    }

module.exports = {
    getAnalystOptions,
    getMyPelanggans,
};

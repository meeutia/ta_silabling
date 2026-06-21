const GOOGLE_CALENDAR_HOLIDAY_ID = 'id.indonesian%23holiday%40group.v.calendar.google.com';
const GOOGLE_CALENDAR_MAX_RESULTS = 2500;
const GOOGLE_CALENDAR_TIMEOUT_MS = 15000;

const getHariLibur = async () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey)
        throw new Error('API_KEY belum dikonfigurasi.');

    const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${GOOGLE_CALENDAR_HOLIDAY_ID}/events?key=${apiKey}&maxResults=${GOOGLE_CALENDAR_MAX_RESULTS}`;
    let url = baseUrl;
    const holidays = [];
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GOOGLE_CALENDAR_TIMEOUT_MS);

    try {
        while (url) {
            const response = await fetch(url, { signal: controller.signal });
            if (!response.ok) {
                throw new Error(`Google Calendar API error: ${response.status}`);
            }
            const data = await response.json();
            (data.items || []).forEach((item) => {
                const date = item.start?.date;
                if (date) {
                    holidays.push({ date, nama: item.summary || 'Hari libur nasional' });
                }
            });
            url = data.nextPageToken ? `${baseUrl}&pageToken=${data.nextPageToken}` : null;
        }
        return holidays;
    }
    catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('Timeout menghubungi Google Calendar API. Silakan coba lagi.');
        }
        throw error;
    }
    finally {
        clearTimeout(timeoutId);
    }
};

module.exports = {
    getHariLibur,
};

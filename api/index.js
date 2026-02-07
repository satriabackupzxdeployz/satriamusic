const axios = require('axios');

async function spotify(input) {
    try {
        if (!input) throw new Error('Input is required.');
        
        const { data: s } = await axios.get(`https://spotdown.org/api/song-details?url=${encodeURIComponent(input)}`, {
            headers: {
                origin: 'https://spotdown.org',
                referer: 'https://spotdown.org/',
                'user-agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36'
            }
        });
        
        const song = s.songs[0];
        if (!song) throw new Error('Track not found.');
        
        const { data } = await axios.post('https://spotdown.org/api/download', {
            url: song.url
        }, {
            headers: {
                origin: 'https://spotdown.org',
                referer: 'https://spotdown.org/',
                'user-agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36'
            },
            responseType: 'arraybuffer'
        });
        
        return {
            metadata: {
                title: song.title,
                artist: song.artist,
                duration: song.duration,
                cover: song.thumbnail,
                url: song.url
            },
            audio: data
        };
    } catch (error) {
        throw new Error(error.message);
    }
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { type, query, url } = req.query;

    try {
        if (type === 'search') {
            const { data } = await axios.get(`https://spotdown.org/api/search?q=${encodeURIComponent(query)}`, {
                headers: {
                    origin: 'https://spotdown.org',
                    referer: 'https://spotdown.org/',
                    'user-agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36'
                }
            });
            res.json(data.songs || []);
        } else if (type === 'stream') {
            const result = await spotify(url);
            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Content-Disposition', 'inline');
            res.send(result.audio);
        } else if (type === 'details') {
            const result = await spotify(url);
            res.json(result.metadata);
        } else {
            res.status(400).json({ error: 'Invalid type parameter' });
        }
    } catch (error) {
        console.error('API Error:', error.message);
        res.status(500).json({ error: error.message });
    }
};
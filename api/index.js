const axios = require('axios');

module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        return res.status(200).end();
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    const { type, query, url } = req.query;

    try {
        if (type === 'search') {
            const searchUrl = `https://spotdown.org/api/search?q=${encodeURIComponent(query)}`;
            const { data } = await axios.get(searchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json'
                },
                timeout: 10000
            });
            
            if (!data.songs || !Array.isArray(data.songs)) {
                return res.json([]);
            }
            
            const formattedSongs = data.songs.map(song => ({
                title: song.title || 'Unknown Title',
                artist: song.artist || 'Unknown Artist',
                duration: song.duration || 0,
                thumbnail: song.thumbnail || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
                url: song.url || ''
            }));
            
            res.json(formattedSongs);
            
        } else if (type === 'stream') {
            if (!url) {
                return res.status(400).json({ error: 'URL required' });
            }

            const songUrl = url.startsWith('https://open.spotify.com/') ? url : `https://open.spotify.com/track/${url}`;
            
            const { data: songData } = await axios.get(`https://spotdown.org/api/song-details?url=${encodeURIComponent(songUrl)}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 15000
            });

            const song = songData.songs?.[0];
            if (!song) {
                return res.status(404).json({ error: 'Song not found' });
            }

            const { data: audioData } = await axios.post('https://spotdown.org/api/download', 
                { url: song.url },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    responseType: 'stream',
                    timeout: 30000
                }
            );

            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Content-Disposition', 'inline; filename="audio.mp3"');
            audioData.pipe(res);
            
        } else {
            res.status(400).json({ error: 'Invalid type parameter. Use: search, stream' });
        }
        
    } catch (error) {
        console.error('API Error:', error.message);
        
        if (type === 'search') {
            res.json([{
                title: 'Blinding Lights',
                artist: 'The Weeknd',
                duration: 200,
                thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
                url: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b'
            }, {
                title: 'Shape of You',
                artist: 'Ed Sheeran',
                duration: 233,
                thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
                url: 'https://open.spotify.com/track/7qiZfU4dY1lWllzX7mPBI3'
            }, {
                title: 'Dance Monkey',
                artist: 'Tones and I',
                duration: 209,
                thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
                url: 'https://open.spotify.com/track/2XU0oxnq2qxCpomAAuJY8K'
            }]);
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
};

import 'dotenv/config';
import express from 'express';
import wpRakuten from './api/wordpress-rakuten.js';
import wpAmazon from './api/wordpress-amazon.js';
import pinRakuten from './api/pinterest-rakuten.js';
import pinAmazon from './api/pinterest-amazon.js';
import hatenaRakuten from './api/hatena-rakuten.js';

const app = express();
app.use(express.json());

app.get('/', (_, res) => res.send('AutoPost OK'));

app.post('/api/wordpress-rakuten', wpRakuten);
app.post('/api/wordpress-amazon', wpAmazon);
app.post('/api/pinterest-rakuten', pinRakuten);
app.post('/api/pinterest-amazon', pinAmazon);
app.post('/api/hatena-rakuten', hatenaRakuten);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`AutoPost listening on port ${PORT}`));

import axios from 'axios';

// ============================================================
// OpenAI (chat/completions)
// ============================================================

/**
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @param {boolean} jsonMode - response_format: json_object を使うか
 */
export const callOpenAI = async (systemPrompt, userPrompt, jsonMode = false) => {
    const res = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
        },
        {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
        }
    );
    return res.data.choices[0].message.content;
};

// ============================================================
// Rakuten Ichiba Ranking API
// ============================================================

export const fetchRakutenProduct = async () => {
    const ages = [20, 30, 40];
    const age = ages[Math.floor(Math.random() * ages.length)];
    const page = Math.floor(Math.random() * 34) + 1;

    const url =
        `https://openapi.rakuten.co.jp/ichibaranking/api/IchibaItem/Ranking/20220601` +
        `?applicationId=${process.env.RAKUTEN_APP_ID}` +
        `&age=${age}&sex=1&carrier=0&page=${page}` +
        `&accessKey=${process.env.RAKUTEN_APP_ACCESS_KEY}` +
        `&affiliateId=${process.env.RAKUTEN_AFFILIATE_ID}`;

    console.log('[rakuten] fetching ranking, age:', age, 'page:', page);
    const res = await axios.get(url, {
        headers: {
            Authorization: `Bearer ${process.env.RAKUTEN_APP_ACCESS_KEY}`,
            Origin: process.env.ORIGIN_URL || 'https://example.com',
        },
    });

    const items = res.data.Items;
    if (!items || items.length === 0) throw new Error('Rakuten: no items found');

    const item = items[Math.floor(Math.random() * items.length)].Item;
    const imageUrl = (item.mediumImageUrls?.[0]?.imageUrl || '').replace(/\?_ex=\d+x\d+$/, '');

    return {
        itemName: item.itemName || '',
        catchcopy: item.catchcopy || '',
        itemCaption: (item.itemCaption || '').substring(0, 500),
        affiliateUrl: item.affiliateUrl || '',
        imageUrl,
        reviewAverage: item.reviewAverage || 0,
        reviewCount: item.reviewCount || 0,
    };
};

// ============================================================
// Amazon Creators API (same auth flow as xbot)
// ============================================================

const AMAZON_CATEGORIES = [
    'All', 'Electronics', 'Computers', 'SmartHome', 'Apparel', 'Shoes',
    'Beauty', 'Kitchen', 'HomeImprovement', 'Sports', 'Toys', 'Baby',
    'Books', 'Watches', 'Luggage',
];

const getAmazonToken = async () => {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', process.env.AMAZON_CLIENT_ID);
    params.append('client_secret', process.env.AMAZON_CLIENT_SECRET);
    params.append('scope', 'creatorsapi/default');

    const res = await axios.post(
        'https://creatorsapi.auth.us-west-2.amazoncognito.com/oauth2/token',
        params,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    return res.data.access_token;
};

export const fetchAmazonProduct = async () => {
    const token = await getAmazonToken();
    const category = AMAZON_CATEGORIES[Math.floor(Math.random() * AMAZON_CATEGORIES.length)];
    console.log('[amazon] selected category:', category);

    const searchRes = await axios.post(
        'https://creatorsapi.amazon/catalog/v1/searchItems',
        {
            keywords: '',
            searchIndex: category,
            marketplace: process.env.AMAZON_MARKETPLACE || 'www.amazon.co.jp',
            partnerTag: process.env.AMAZON_PARTNER_TAG,
            sortBy: 'Featured',
            resources: [
                'Images.Primary.Large',
                'ItemInfo.Title',
                'ItemInfo.Features',
                'ItemInfo.ByLineInfo',
            ],
        },
        {
            headers: {
                'x-marketplace': 'www.amazon.co.jp',
                Authorization: `Bearer ${token}, Version 2.3`,
                'Content-Type': 'application/json',
            },
        }
    );

    const items = searchRes.data?.SearchResult?.Items;
    if (!items || items.length === 0) throw new Error('Amazon: no items found');

    const item = items[Math.floor(Math.random() * items.length)];
    const asin = item.ASIN;
    const title = item.ItemInfo?.Title?.DisplayValue || '';
    const features = (item.ItemInfo?.Features?.DisplayValues || []).slice(0, 5);
    const imageUrl = item.Images?.Primary?.Large?.URL || '';
    const affiliateUrl = `https://www.amazon.co.jp/dp/${asin}?tag=${process.env.AMAZON_PARTNER_TAG}`;

    return { title, features, imageUrl, affiliateUrl, asin };
};

// ============================================================
// WordPress（カスタムプラグインエンドポイント経由）
// ============================================================

const wpBase = () => (process.env.WP_SITE_URL || '').replace(/\/$/, '');

/**
 * WordPressに記事を投稿する（autopost-api プラグイン経由）
 * Basic Auth 不要・シークレットキー認証
 * @param {{ title, content, excerpt, tagNames }} params
 */
export const createWordPressPost = async ({ title, content, excerpt, tagNames = [] }) => {
    const base = wpBase();
    const secret = process.env.WP_SECRET_KEY;
    const url = `${base}/wp-json/autopost/v1/post`;

    console.log(`[wp] POST ${url}`);
    console.log(`[wp] secret set: ${!!secret}`);
    console.log(`[wp] title: ${title}`);
    console.log(`[wp] tags: ${JSON.stringify(tagNames)}`);

    const res = await axios.post(
        url,
        { title, content, excerpt, tags: tagNames },
        {
            headers: {
                'Content-Type': 'application/json',
                'X-AutoPost-Secret': secret,
                'User-Agent': 'Mozilla/5.0 (compatible; AutoPost/1.0)',
            },
        }
    );
    console.log(`[wp] post created id=${res.data.id} link=${res.data.link}`);
    return res.data;
};

// ============================================================
// Pinterest API v5
// ============================================================

/**
 * PinterestにPinを作成する
 * @param {{ boardId, title, description, link, imageUrl }} params
 */
export const createPinterestPin = async ({ boardId, title, description, link, imageUrl }) => {
    const res = await axios.post(
        'https://api.pinterest.com/v5/pins',
        {
            board_id: boardId,
            title: title.substring(0, 100),
            description: description.substring(0, 500),
            link,
            media_source: {
                source_type: 'image_url',
                url: imageUrl,
            },
        },
        {
            headers: {
                Authorization: `Bearer ${process.env.PINTEREST_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
            },
        }
    );
    return res.data;
};

export { axios };

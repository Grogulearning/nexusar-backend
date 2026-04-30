const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

const CLOUD_NAME = 'dc7luprai';
const API_KEY = '474818474224319';
const API_SECRET = 'y-RkFtDP_5XjiC-x5RO5rf5Ciw0';

const JSONBIN_BIN_ID = '69f2ee5f36566621a80acf60';
const JSONBIN_KEY = '$2a$10$oPhxY7irv1XzmAdpwLp2IeSzvFxOXRdEBhPjhjcsr07hYF3E6jC2G';
const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['Content-Type'] }));
app.use(express.json());
app.options('*', cors());

async function getExperiences() {
  const res = await fetch(`${JSONBIN_URL}/latest`, { headers: { 'X-Master-Key': JSONBIN_KEY } });
  const data = await res.json();
  return data.record?.experiences || [];
}

async function saveExperiences(experiences) {
  await fetch(JSONBIN_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Master-Key': JSONBIN_KEY },
    body: JSON.stringify({ experiences })
  });
}

app.post('/api/save-experience', async (req, res) => {
  try {
    const { name, imgURL, vidURL, viewerURL, mindURL, shape } = req.body;
    if (!name || !imgURL || !vidURL) return res.status(400).json({ error: 'Faltan datos' });
    const experience = { id: Date.now().toString(), name, imgURL, vidURL, viewerURL: viewerURL || '', mindURL: mindURL || null, shape: shape || 'none', created: new Date().toISOString(), public: true };
    const experiences = await getExperiences();
    experiences.unshift(experience);
    await saveExperiences(experiences.slice(0, 100));
    res.json({ success: true, id: experience.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/get-experiences', async (req, res) => {
  try {
    const experiences = await getExperiences();
    res.json(experiences.filter(e => e.public !== false));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/delete-experience', async (req, res) => {
  try {
    const { id, imgURL, vidURL } = req.body;
    if (!id) return res.status(400).json({ error: 'ID requerido' });
    const experiences = await getExperiences();
    const index = experiences.findIndex(e => e.id === id);
    if (index === -1) return res.status(404).json({ error: 'No encontrada' });
    if (imgURL) { const imgID = extractPublicID(imgURL); if (imgID) await deleteFromCloudinary(imgID, 'image'); }
    if (vidURL) { const vidID = extractPublicID(vidURL); if (vidID) await deleteFromCloudinary(vidID, 'video'); }
    experiences.splice(index, 1);
    await saveExperiences(experiences);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/health', async (req, res) => {
  try { const e = await getExperiences(); res.json({ status: 'ok', experiences: e.length }); }
  catch(e) { res.json({ status: 'ok', experiences: 0 }); }
});

function extractPublicID(url) { const m = url.match(/\/v\d+\/(.+)\.\w+$/); return m ? m[1] : null; }

async function deleteFromCloudinary(publicId, resourceType) {
  const timestamp = Math.round(Date.now() / 1000);
  const signature = crypto.createHash('sha1').update(`public_id=${publicId}&timestamp=${timestamp}${API_SECRET}`).digest('hex');
  const formData = new URLSearchParams();
  formData.append('public_id', publicId); formData.append('signature', signature);
  formData.append('api_key', API_KEY); formData.append('timestamp', timestamp);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/destroy`, { method: 'POST', body: formData });
  return res.json();
}

app.listen(PORT, () => console.log(`NexusAR Backend running on port ${PORT}`));

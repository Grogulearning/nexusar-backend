const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de Cloudinary
const CLOUD_NAME = 'dc7luprai';
const API_KEY = '474818474224319';
const API_SECRET = 'y-RkFtDP_5XjiC-x5RO5rf5Ciw0';

// Middleware
app.use(cors());
app.use(express.json());

// Base de datos en memoria
let experiences = [];

// GUARDAR EXPERIENCIA
app.post('/api/save-experience', (req, res) => {
  try {
    const { name, imgURL, vidURL, viewerURL } = req.body;

    if (!name || !imgURL || !vidURL) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    const experience = {
      id: Date.now().toString(),
      name,
      imgURL,
      vidURL,
      viewerURL: viewerURL || '',
      created: new Date().toISOString(),
      public: true
    };

    experiences.unshift(experience);
    
    if (experiences.length > 100) {
      experiences = experiences.slice(0, 100);
    }

    res.json({ 
      success: true, 
      id: experience.id,
      message: 'Experiencia guardada' 
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// OBTENER EXPERIENCIAS
app.get('/api/get-experiences', (req, res) => {
  try {
    const publicExperiences = experiences.filter(exp => exp.public !== false);
    res.json(publicExperiences);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ELIMINAR EXPERIENCIA
app.post('/api/delete-experience', async (req, res) => {
  try {
    const { id, imgURL, vidURL } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'ID requerido' });
    }

    const index = experiences.findIndex(exp => exp.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Experiencia no encontrada' });
    }

    const results = { image: null, video: null };

    if (imgURL) {
      const imgID = extractPublicID(imgURL);
      if (imgID) {
        results.image = await deleteFromCloudinary(imgID, 'image');
      }
    }

    if (vidURL) {
      const vidID = extractPublicID(vidURL);
      if (vidID) {
        results.video = await deleteFromCloudinary(vidID, 'video');
      }
    }

    experiences.splice(index, 1);

    res.json({ 
      success: true, 
      message: 'Experiencia y archivos eliminados',
      cloudinary: results
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// HELPERS
function extractPublicID(url) {
  const match = url.match(/\/v\d+\/(.+)\.\w+$/);
  return match ? match[1] : null;
}

async function deleteFromCloudinary(publicId, resourceType = 'image') {
  const timestamp = Math.round(Date.now() / 1000);
  const signature = crypto
    .createHash('sha1')
    .update(`public_id=${publicId}&timestamp=${timestamp}${API_SECRET}`)
    .digest('hex');

  const formData = new URLSearchParams();
  formData.append('public_id', publicId);
  formData.append('signature', signature);
  formData.append('api_key', API_KEY);
  formData.append('timestamp', timestamp);

  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/destroy`;
  
  const response = await fetch(url, {
    method: 'POST',
    body: formData
  });

  return response.json();
}

// HEALTH CHECK
app.get('/health', (req, res) => {
  res.json({ status: 'ok', experiences: experiences.length });
});

app.listen(PORT, () => {
  console.log(`🚀 NexusAR Backend running on port ${PORT}`);
});

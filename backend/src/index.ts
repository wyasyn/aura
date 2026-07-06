import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import assessmentRoutes from './routes/assessment-routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({ 
  origin: '*', 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api', assessmentRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Aurora Skin Assessment API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      assess: 'POST /api/assess',
      upload: 'POST /api/upload'
    }
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Aurora Skin Assessment API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      assess: 'POST /api/assess',
      upload: 'POST /api/upload'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log('========================================');
  console.log('🚀 Aurora Skin Assessment API');
  console.log('========================================');
  console.log(`📍 Server running on http://localhost:${PORT}`);
  console.log(`📸 Upload endpoint: http://localhost:${PORT}/api/upload`);
  console.log(`🔍 Assess endpoint: http://localhost:${PORT}/api/assess`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  console.log('========================================');
  console.log('📊 Entities:');
  console.log('  1. User Profile');
  console.log('  2. Assessment Image');
  console.log('  3. Skin Type');
  console.log('  4. Skin Parameter');
  console.log('  5. Skin Assessment Report');
  console.log('  6. Recommendation');
  console.log('========================================');
});

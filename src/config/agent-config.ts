export const newsBotConfig = {
  name: 'AI_News_Bot',
  description: 'Autonomous agent for sharing AI and technology news',
  newsSourceUrls: [
    'https://techcrunch.com/artificial-intelligence/',
    'https://venturebeat.com/category/ai/',
    // Add more sources
  ],
  postingInterval: 1800000, // 30 minutes
  memory: {
    enabled: true,
    type: 'supabase', // ElizaOS's default memory provider
  },
  providers: {
    // Configure ElizaOS providers
  }
};
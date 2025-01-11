import { PostTemplates } from '../../src/twitter/PostTemplates';

describe('PostTemplates', () => {
  describe('breakingNews', () => {
    it('should create a breaking news post', () => {
      const post = PostTemplates.breakingNews(
        'GPT-4 Turbo Released',
        'OpenAI launches faster and more efficient GPT-4',
        'https://example.com',
        ['#AI', '#GPT4', '#OpenAI']
      );

      expect(post.content).toContain('🚨 Breaking AI News');
      expect(post.content).toContain('GPT-4 Turbo Released');
      expect(post.content).toContain('#AI');
    });
  });

  describe('researchThread', () => {
    it('should create a research paper thread', () => {
      const thread = PostTemplates.researchThread({
        title: 'New Transformer Architecture',
        keyPoints: ['Improved efficiency', 'Better scaling'],
        implications: ['Faster training', 'Lower costs'],
        link: 'https://example.com',
        hashtags: ['#AI', '#ML']
      });

      expect(thread[0].content).toContain('📑 New AI Research Alert');
      expect(thread[1].content).toContain('Key Findings');
      expect(thread).toHaveLength(4);
      expect(thread[thread.length - 1].content).toContain('#AI');
    });
  });

  describe('productLaunch', () => {
    it('should create a product launch thread', () => {
      const thread = PostTemplates.productLaunch({
        name: 'AI Tool v2.0',
        features: ['Feature 1', 'Feature 2'],
        link: 'https://example.com',
        hashtags: ['#Launch', '#AI']
      });

      expect(thread[0].content).toContain('🎉 New Launch Alert');
      expect(thread[1].content).toContain('Key Features');
      expect(thread).toHaveLength(3);
    });
  });

  describe('industryAnalysis', () => {
    it('should create an industry analysis thread', () => {
      const thread = PostTemplates.industryAnalysis({
        topic: 'AI Market Trends 2025',
        points: ['Point 1', 'Point 2'],
        conclusion: 'Final thoughts',
        hashtags: ['#AITrends']
      });

      expect(thread[0].content).toContain('📊 AI Industry Analysis');
      expect(thread[thread.length - 1].content).toContain('Key Takeaway');
      expect(thread[thread.length - 1].content).toContain('#AITrends');
    });
  });

  describe('technicalTutorial', () => {
    it('should create a tutorial thread', () => {
      const thread = PostTemplates.technicalTutorial({
        topic: 'Using Transformers',
        steps: ['Step 1', 'Step 2'],
        codeSnippets: ['code1', 'code2'],
        resources: 'Additional links',
        hashtags: ['#Tutorial', '#AI']
      });

      expect(thread[0].content).toContain('📚 Quick Tutorial');
      expect(thread[1].content).toContain('code1');
      expect(thread[thread.length - 1].content).toContain('Resources');
    });
  });

  describe('toolComparison', () => {
    it('should create a comparison thread', () => {
      const thread = PostTemplates.toolComparison({
        title: 'Top AI Tools Comparison',
        comparisons: [{
          tool: 'Tool A',
          pros: ['Fast', 'Easy'],
          cons: ['Expensive']
        }],
        hashtags: ['#AITools']
      });

      expect(thread[0].content).toContain('Top AI Tools Comparison');
      expect(thread[1].content).toContain('✅ Pros');
      expect(thread[1].content).toContain('❌ Cons');
      expect(thread[thread.length - 1].content).toContain('#AITools');
    });
  });
});
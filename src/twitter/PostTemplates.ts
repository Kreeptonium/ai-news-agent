import { BasePost, ThreadPost } from './types/PostTypes';

export class PostTemplates {
  // Breaking News Template
  static breakingNews(title: string, summary: string, link: string, hashtags: string[]): BasePost {
    return {
      content: `🚨 Breaking AI News\n\n${title}\n\n${summary}\n\n🔗 Read more: ${link}\n\n${hashtags.join(' ')}`,
      media: [] // Optional: Add relevant image
    };
  }

  // Research Paper Analysis Thread
  static researchThread(paper: {
    title: string,
    keyPoints: string[],
    implications: string[],
    link: string,
    hashtags: string[]
  }): ThreadPost[] {
    return [
      {
        index: 1,
        content: `📑 New AI Research Alert!\n\n${paper.title}\n\nA thread 🧵⬇️`,
        delay: 2000
      },
      {
        index: 2,
        content: "🔍 Key Findings:\n\n" + paper.keyPoints.map(point => `• ${point}`).join('\n\n'),
        delay: 2000
      },
      {
        index: 3,
        content: "💡 Implications:\n\n" + paper.implications.map(imp => `• ${imp}`).join('\n\n'),
        delay: 2000
      },
      {
        index: 4,
        content: `🔗 Paper link: ${paper.link}\n\n${paper.hashtags.join(' ')}`,
        delay: 2000
      }
    ];
  }

  // Product Launch / Update
  static productLaunch(product: {
    name: string,
    features: string[],
    link: string,
    hashtags: string[]
  }): ThreadPost[] {
    return [
      {
        index: 1,
        content: `🎉 New Launch Alert: ${product.name}\n\nHere's everything you need to know 🧵⬇️`,
        delay: 2000
      },
      {
        index: 2,
        content: "✨ Key Features:\n\n" + product.features.map(feature => `• ${feature}`).join('\n\n'),
        delay: 2000
      },
      {
        index: 3,
        content: `🔗 Try it out: ${product.link}\n\n${product.hashtags.join(' ')}`,
        delay: 2000
      }
    ];
  }

  // AI Industry Analysis
  static industryAnalysis(analysis: {
    topic: string,
    points: string[],
    conclusion: string,
    hashtags: string[]
  }): ThreadPost[] {
    return [
      {
        index: 1,
        content: `📊 AI Industry Analysis: ${analysis.topic}\n\nLet's dive in 🧵⬇️`,
        delay: 2000
      },
      ...analysis.points.map((point, index) => ({
        index: index + 2,
        content: point,
        delay: 2000
      })),
      {
        index: analysis.points.length + 2,
        content: `🎯 Key Takeaway:\n\n${analysis.conclusion}\n\n${analysis.hashtags.join(' ')}`,
        delay: 2000
      }
    ];
  }

  // Technical Tutorial Thread
  static technicalTutorial(tutorial: {
    topic: string,
    steps: string[],
    codeSnippets?: string[],
    resources: string,
    hashtags: string[]
  }): ThreadPost[] {
    const thread: ThreadPost[] = [
      {
        index: 1,
        content: `📚 Quick Tutorial: ${tutorial.topic}\n\nFollow along 🧵⬇️`,
        delay: 2000
      }
    ];

    // Add steps with optional code snippets
    tutorial.steps.forEach((step, index) => {
      thread.push({
        index: index + 2,
        content: step + (tutorial.codeSnippets?.[index] ? `\n\nCode:\n${tutorial.codeSnippets[index]}` : ''),
        delay: 2000
      });
    });

    // Add resources
    thread.push({
        index: tutorial.steps.length + 2,
        content: `📌 Useful Resources:\n\n${tutorial.resources}\n\n${tutorial.hashtags.join(' ')}`,
        delay: 2000
    });

    return thread;
  }

  // AI Tool Comparison
  static toolComparison(tools: {
    title: string,
    comparisons: Array<{tool: string, pros: string[], cons: string[]}>,
    hashtags: string[]
  }): ThreadPost[] {
    const thread: ThreadPost[] = [
      {
        index: 1,
        content: `🔄 ${tools.title}\n\nA detailed comparison 🧵⬇️`,
        delay: 2000
      }
    ];

    tools.comparisons.forEach((tool, index) => {
      thread.push({
        index: index + 2,
        content: `${tool.tool}\n\n✅ Pros:\n${tool.pros.map(pro => `• ${pro}`).join('\n')}\n\n❌ Cons:\n${tool.cons.map(con => `• ${con}`).join('\n')}`,
        delay: 2000
      });
    });

    thread.push({
      index: tools.comparisons.length + 2,
      content: `Hope this helps you choose!\n\n${tools.hashtags.join(' ')}`,
      delay: 2000
    });

    return thread;
  }
}
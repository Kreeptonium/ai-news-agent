import { NewsAgent } from './agents/NewsAgent';

async function main() {
  try {
    const agent = new NewsAgent();
    await agent.initialize();
    await agent.start();
  } catch (error) {
    console.error('Error starting the news agent:', error);
    process.exit(1);
  }
}

main();
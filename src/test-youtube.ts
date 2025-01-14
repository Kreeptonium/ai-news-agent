import ContentManager from './automation/ContentManager';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testYouTubeContent() {
    const manager = new ContentManager();
    
    try {
        console.log('Testing YouTube Content Generation...');

        // Test AI videos
        console.log('\n1. Testing AI YouTube Content');
        await manager.generateAndPost('youtube_ai');

        // Add delay between posts
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Test Tech videos
        console.log('\n2. Testing Tech YouTube Content');
        await manager.generateAndPost('youtube_tech');

        await new Promise(resolve => setTimeout(resolve, 5000));

        // Test Tutorial videos
        console.log('\n3. Testing Tutorial YouTube Content');
        await manager.generateAndPost('youtube_tutorial');

        // Test mixed content with YouTube supplements
        console.log('\n4. Testing Mixed Content with YouTube');
        await manager.generateAndPost('news'); // This will include relevant YouTube content

        console.log('\nAll YouTube tests completed successfully!');
    } catch (error) {
        console.error('Error during YouTube tests:', error);
        if (error instanceof Error) {
            console.error('Error details:', error.message);
        }
    } finally {
        await manager.close();
    }
}

// Run the test
testYouTubeContent().catch(console.error);
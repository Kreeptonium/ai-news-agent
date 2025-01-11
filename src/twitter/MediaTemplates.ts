import { MediaContent } from './types/PostTypes';

export class MediaTemplates {
  // Standard image templates
  static newsImage(imageUrl: string): MediaContent {
    return {
      type: 'image',
      url: imageUrl,
      altText: 'AI News visualization'
    };
  }

  // Comparison images grid (up to 4 images)
  static comparisonGrid(imageUrls: string[]): MediaContent[] {
    return imageUrls.slice(0, 4).map(url => ({
      type: 'image',
      url,
      altText: 'Comparison visualization'
    }));
  }

  // Tutorial steps with images
  static tutorialSteps(stepImages: string[]): MediaContent[] {
    return stepImages.slice(0, 4).map((url, index) => ({
      type: 'image',
      url,
      altText: `Tutorial step ${index + 1}`
    }));
  }

  // Research paper visualizations
  static researchVisuals(imageUrls: string[]): MediaContent[] {
    return imageUrls.slice(0, 4).map(url => ({
      type: 'image',
      url,
      altText: 'Research visualization'
    }));
  }
}
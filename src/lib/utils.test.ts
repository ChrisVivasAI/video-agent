import { describe, it, expect } from 'vitest';
import { resolveMediaUrl, resolveDuration } from './utils';
import type { MediaItem } from '../data/schema';

const baseGenerated: Omit<MediaItem, 'kind' | 'endpointId' | 'requestId' | 'url'> & {kind: 'generated', endpointId: string, requestId: string} = {
  id: '1',
  kind: 'generated',
  endpointId: 'ep',
  requestId: 'req',
  projectId: 'p',
  mediaType: 'video',
  status: 'completed',
  createdAt: 0,
  input: {},
};

const uploadedBase: Omit<MediaItem, 'kind' | 'endpointId' | 'requestId'> & {kind: 'uploaded'} = {
  id: 'u1',
  kind: 'uploaded',
  projectId: 'p',
  mediaType: 'video',
  status: 'completed',
  createdAt: 0,
  url: 'http://example.com/upload.mp4',
};

describe('resolveMediaUrl', () => {
  it('returns null for undefined', () => {
    expect(resolveMediaUrl(undefined)).toBeNull();
  });

  it('returns url for uploaded items', () => {
    expect(resolveMediaUrl(uploadedBase)).toBe('http://example.com/upload.mp4');
  });

  it('handles images array of strings', () => {
    const item: MediaItem = {
      ...baseGenerated,
      output: { images: ['http://img/img.png'] },
    } as MediaItem;
    expect(resolveMediaUrl(item)).toBe('http://img/img.png');
  });

  it('handles images array of objects', () => {
    const item: MediaItem = {
      ...baseGenerated,
      output: { images: [{ url: 'http://img/obj.png' }] },
    } as MediaItem;
    expect(resolveMediaUrl(item)).toBe('http://img/obj.png');
  });

  it('handles video property objects', () => {
    const item: MediaItem = {
      ...baseGenerated,
      output: { video: { url: 'http://vid/video.mp4' } },
    } as MediaItem;
    expect(resolveMediaUrl(item)).toBe('http://vid/video.mp4');
  });

  it('handles audio_url property string', () => {
    const item: MediaItem = {
      ...baseGenerated,
      output: { audio_url: 'http://aud/audio.mp3' },
    } as MediaItem;
    expect(resolveMediaUrl(item)).toBe('http://aud/audio.mp3');
  });
});

describe('resolveDuration', () => {
  it('returns null for undefined', () => {
    expect(resolveDuration(undefined as any)).toBeNull();
  });

  it('uses metadata.duration when available', () => {
    const item: MediaItem = {
      ...baseGenerated,
      metadata: { duration: 4 },
    } as MediaItem;
    expect(resolveDuration(item)).toBe(4000);
  });

  it('uses seconds_total from output', () => {
    const item: MediaItem = {
      ...baseGenerated,
      output: { seconds_total: 3 },
    } as MediaItem;
    expect(resolveDuration(item)).toBe(3000);
  });

  it('uses audio.duration from output', () => {
    const item: MediaItem = {
      ...baseGenerated,
      output: { audio: { duration: 5 } },
    } as MediaItem;
    expect(resolveDuration(item)).toBe(5000);
  });

  it('returns null when nothing found', () => {
    const item: MediaItem = {
      ...baseGenerated,
      output: {},
    } as MediaItem;
    expect(resolveDuration(item)).toBeNull();
  });
});

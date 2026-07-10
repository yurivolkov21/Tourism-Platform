import { BadRequestException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import {
  CreateSignedUploadUrlDto,
  UploadPurpose,
} from './dto/create-signed-upload-url.dto';
import { UploadsService } from './uploads.service';

const CONFIG: Record<string, string> = {
  'cloudinary.cloudName': 'demo',
  'cloudinary.apiKey': 'key',
  'cloudinary.apiSecret': 'secret',
  'cloudinary.uploadFolder': 'tourism',
};

function makeService(): UploadsService {
  const config = {
    getOrThrow: (key: string) => CONFIG[key],
  } as unknown as ConfigService;
  const svc = new UploadsService(config);
  svc.onModuleInit();
  return svc;
}

function body(
  over: Partial<CreateSignedUploadUrlDto>,
): CreateSignedUploadUrlDto {
  return {
    purpose: UploadPurpose.TOUR_HERO,
    filename: 'x.jpg',
    ...over,
  } as CreateSignedUploadUrlDto;
}

describe('UploadsService.createSignedUploadParams', () => {
  it('maps a tour-hero image purpose to folder + image resource type', () => {
    const res = makeService().createSignedUploadParams(
      body({ purpose: UploadPurpose.TOUR_HERO, filename: 'Hero Shot.JPG' }),
    );
    expect(res.folder).toBe('tourism/tours/hero');
    expect(res.resourceType).toBe('image');
    expect(res.publicId).toMatch(/^\d+-hero-shot$/);
    expect(res.uploadUrl).toBe(
      'https://api.cloudinary.com/v1_1/demo/image/upload',
    );
    expect(res.signature).toBeTruthy();
    expect(res.timestamp).toBeGreaterThan(0);
  });

  it('maps a video purpose to the video endpoint', () => {
    const res = makeService().createSignedUploadParams(
      body({ purpose: UploadPurpose.TOUR_VIDEO, filename: 'clip.mp4' }),
    );
    expect(res.resourceType).toBe('video');
    expect(res.folder).toBe('tourism/tours/video');
  });

  it('rejects an extension that does not match the resource type (400)', () => {
    expect(() =>
      makeService().createSignedUploadParams(
        body({ purpose: UploadPurpose.TOUR_HERO, filename: 'clip.mp4' }),
      ),
    ).toThrow(BadRequestException);
  });

  it('rejects a contentType whose major type disagrees (400)', () => {
    expect(() =>
      makeService().createSignedUploadParams(
        body({ filename: 'x.jpg', contentType: 'video/mp4' }),
      ),
    ).toThrow(BadRequestException);
  });

  it('signs DESTINATION_GALLERY into the destinations/gallery image folder', () => {
    const res = makeService().createSignedUploadParams(
      body({
        purpose: UploadPurpose.DESTINATION_GALLERY,
        filename: 'beach.jpg',
      }),
    );
    expect(res.resourceType).toBe('image');
    expect(res.folder).toBe('tourism/destinations/gallery');
    expect(res.uploadUrl).toBe(
      'https://api.cloudinary.com/v1_1/demo/image/upload',
    );
  });

  it('signs a POST_COVER upload into the posts/cover folder', async () => {
    const res = makeService().createSignedUploadParams(
      body({ purpose: UploadPurpose.POST_COVER, filename: 'cover.jpg' }),
    );
    expect(res.folder).toMatch(/posts\/cover$/);
    expect(res.resourceType).toBe('image');
  });

  it('signs a POST_BODY upload into the posts/body folder', async () => {
    const res = makeService().createSignedUploadParams(
      body({ purpose: UploadPurpose.POST_BODY, filename: 'shot.jpg' }),
    );
    expect(res.folder).toBe('tourism/posts/body');
    expect(res.resourceType).toBe('image');
  });

  it('sanitizes the public_id from the filename', () => {
    const res = makeService().createSignedUploadParams(
      body({ purpose: UploadPurpose.TOUR_GALLERY, filename: 'My Photo!!.png' }),
    );
    expect(res.publicId).toMatch(/^\d+-my-photo$/);
    expect(res.folder).toBe('tourism/tours/gallery');
  });
});

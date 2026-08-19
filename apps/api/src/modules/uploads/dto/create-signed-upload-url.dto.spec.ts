import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateSignedUploadUrlDto,
  UploadPurpose,
} from './create-signed-upload-url.dto';

async function filenameErrors(filename: string): Promise<number> {
  const dto = plainToInstance(CreateSignedUploadUrlDto, {
    purpose: UploadPurpose.TOUR_HERO,
    filename,
  });
  const errors = await validate(dto);
  return errors.filter((e) => e.property === 'filename').length;
}

describe('CreateSignedUploadUrlDto filename validation', () => {
  it('accepts plain ascii names', async () => {
    expect(await filenameErrors('hero-shot.jpg')).toBe(0);
  });

  it('accepts real-world names: spaces, parentheses, unicode (the service re-sanitizes)', async () => {
    // Windows screenshot default name — the original bug report.
    expect(await filenameErrors('Screenshot 2026-07-17 222530.png')).toBe(0);
    expect(await filenameErrors('image (1).png')).toBe(0);
    expect(await filenameErrors('ảnh nền đẹp.jpg')).toBe(0);
  });

  it('still rejects path traversal and extension-less names', async () => {
    expect(await filenameErrors('../../etc/passwd')).toBeGreaterThan(0);
    expect(await filenameErrors('a/b.png')).toBeGreaterThan(0);
    expect(await filenameErrors('a\\b.png')).toBeGreaterThan(0);
    expect(await filenameErrors('no-extension')).toBeGreaterThan(0);
    expect(await filenameErrors('bad.extension-way-too-long')).toBeGreaterThan(
      0,
    );
  });
});

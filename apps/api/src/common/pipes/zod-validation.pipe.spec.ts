import { describe, it, expect } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe.js';

describe('ZodValidationPipe', () => {
  const testSchema = z.object({
    email: z.string().email(),
    age: z.number().min(18),
  });

  const pipe = new ZodValidationPipe(testSchema);

  it('should transform and return valid data', () => {
    const validData = { email: 'test@hotel.com', age: 25 };
    const result = pipe.transform(validData, { type: 'body' });
    expect(result).toEqual(validData);
  });

  it('should throw BadRequestException on invalid data', () => {
    const invalidData = { email: 'not-an-email', age: 16 };
    expect(() => pipe.transform(invalidData, { type: 'body' })).toThrow(
      BadRequestException,
    );
  });
});

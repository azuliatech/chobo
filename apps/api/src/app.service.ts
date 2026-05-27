import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    const env = process.env.NODE_ENV || 'development';
    return `KashAm API is fully operational in [${env.toUpperCase()}] mode! 🚀`;
  }
}

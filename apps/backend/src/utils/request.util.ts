import { Request } from 'express';
import geoip from 'geoip-lite';
import { UAParser } from 'ua-parser-js';

export interface DeviceMetadata {
  raw: string;
  browser: string;
  os: string;
  device: string;
  displayName: string;
  isAutomated: boolean;
}

export interface LocationMetadata {
  ip: string;
  city: string;
  region: string;
  country: string;
  displayLocation: string;
}

export class RequestUtil {
  /**
   * Resolves the true client IP, prioritizing Cloudflare and X-Forwarded headers,
   * while normalizing IPv6 loopback addresses.
   */
  static getIp(req: Request): string {
    const cfIp = req.headers['cf-connecting-ip'];
    const forwarded = req.headers['x-forwarded-for'];
    const realIp = req.headers['x-real-ip'];

    let ip = (forwarded || realIp || cfIp || req.socket.remoteAddress || req.ip || '127.0.0.1') as string;

    if (typeof ip === 'string' && ip.includes(',')) {
      ip = ip.split(',')[0].trim();
    }

    if (ip === '::1' || ip === '::ffff:127.0.0.1') {
      return '127.0.0.1';
    }

    return ip;
  }

  /**
   * Resolves physical location using GeoIP with fallback handling for local subnets.
   */
  static getLocation(ip: string): LocationMetadata {
    if (ip === '127.0.0.1' || ip === 'localhost' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return {
        ip,
        city: 'Local',
        region: 'Internal',
        country: 'Dev Network',
        displayLocation: 'Local Development Network'
      };
    }

    const geo = geoip.lookup(ip);
    if (!geo) {
      return {
        ip,
        city: 'Unknown',
        region: 'Unknown',
        country: 'Unknown',
        displayLocation: 'Unresolved Location'
      };
    }

    const parts = [geo.city, geo.region, geo.country].filter(Boolean);
    return {
      ip,
      city: geo.city || 'Unknown City',
      region: geo.region || '',
      country: geo.country || 'Unknown Country',
      displayLocation: parts.join(', ')
    };
  }

  /**
   * Parses the User-Agent into clean hardware/software descriptions,
   * distinguishing automated M2M engines from human web browsers.
   */
  static getDevice(req: Request | string): DeviceMetadata {
    const rawAgent = typeof req === 'string' ? req : (req.headers['user-agent'] || 'System Automated Process');
    
    // Catch known M2M/automated actors
    const lower = rawAgent.toLowerCase();
    if (
      rawAgent === 'M2M Module SDK' || 
      lower.includes('axios') || 
      lower.includes('postman') || 
      lower.includes('curl') ||
      lower.includes('node-fetch')
    ) {
      return {
        raw: rawAgent,
        browser: 'M2M SDK',
        os: 'Automated Worker',
        device: 'Server Integration',
        displayName: rawAgent,
        isAutomated: true
      };
    }

    const parser = new UAParser(rawAgent);
    const browser = parser.getBrowser().name || '';
    const browserVersion = parser.getBrowser().major || '';
    const os = parser.getOS().name || '';
    const osVersion = parser.getOS().version || '';
    const device = parser.getDevice().model || parser.getDevice().type || '';

    const browserStr = [browser, browserVersion].filter(Boolean).join(' ');
    const osStr = [os, osVersion].filter(Boolean).join(' ');

    let displayName = 'Unknown Device';
    if (browserStr && osStr) {
      displayName = `${browserStr} on ${osStr}`;
    } else if (browserStr || osStr) {
      displayName = browserStr || osStr;
    } else {
      displayName = rawAgent.slice(0, 40);
    }

    return {
      raw: rawAgent,
      browser: browser || 'Unknown Browser',
      os: os || 'Unknown OS',
      device: device || 'Desktop/Workstation',
      displayName,
      isAutomated: false
    };
  }

  static getAgent(req: Request, fallback: string = 'Unknown Agent'): string {
    return req.headers['user-agent'] || fallback;
  }
}
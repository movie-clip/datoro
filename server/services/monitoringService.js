/**
 * Monitoring Service
 * 
 * Tracks application metrics and provides a monitoring dashboard
 * Works with or without Sentry
 */

class MonitoringService {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        byEndpoint: {},
        byStatus: {
          '2xx': 0,
          '3xx': 0,
          '4xx': 0,
          '5xx': 0
        }
      },
      performance: {
        responseTimes: [],
        slowQueries: [],
        avgResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0,
        bytesSaved: 0
      },
      rateLimit: {
        blocked: 0,
        slowed: 0,
        byIP: {}
      },
      errors: {
        total: 0,
        byCode: {},
        byEndpoint: {},
        recent: []
      },
      system: {
        uptime: Date.now(),
        memory: {},
        cpu: {}
      }
    };

    // Update metrics every 10 seconds
    setInterval(() => this.updateSystemMetrics(), 10000);
    this.updateSystemMetrics();
  }

  /**
   * Track request
   */
  trackRequest(req, res, duration) {
    this.metrics.requests.total++;

    // Track by endpoint
    const endpoint = this.normalizeEndpoint(req.path);
    this.metrics.requests.byEndpoint[endpoint] = 
      (this.metrics.requests.byEndpoint[endpoint] || 0) + 1;

    // Track by status code range
    const statusRange = `${Math.floor(res.statusCode / 100)}xx`;
    if (this.metrics.requests.byStatus[statusRange] !== undefined) {
      this.metrics.requests.byStatus[statusRange]++;
    }

    // Track response time
    this.trackResponseTime(duration);

    // Track slow queries (>2 seconds)
    if (duration > 2000) {
      this.metrics.performance.slowQueries.push({
        endpoint,
        duration,
        timestamp: new Date().toISOString(),
        method: req.method
      });

      // Keep only last 50 slow queries
      if (this.metrics.performance.slowQueries.length > 50) {
        this.metrics.performance.slowQueries.shift();
      }
    }
  }

  /**
   * Track response time
   */
  trackResponseTime(duration) {
    this.metrics.performance.responseTimes.push(duration);

    // Keep only last 1000 response times
    if (this.metrics.performance.responseTimes.length > 1000) {
      this.metrics.performance.responseTimes.shift();
    }

    // Calculate percentiles
    if (this.metrics.performance.responseTimes.length > 0) {
      const sorted = [...this.metrics.performance.responseTimes].sort((a, b) => a - b);
      const len = sorted.length;

      this.metrics.performance.avgResponseTime = 
        Math.round(sorted.reduce((a, b) => a + b, 0) / len);
      
      this.metrics.performance.p95ResponseTime = 
        Math.round(sorted[Math.floor(len * 0.95)]);
      
      this.metrics.performance.p99ResponseTime = 
        Math.round(sorted[Math.floor(len * 0.99)]);
    }
  }

  /**
   * Track cache hit/miss
   */
  trackCache(hit, bytesSaved = 0) {
    if (hit) {
      this.metrics.cache.hits++;
      this.metrics.cache.bytesSaved += bytesSaved;
    } else {
      this.metrics.cache.misses++;
    }

    const total = this.metrics.cache.hits + this.metrics.cache.misses;
    this.metrics.cache.hitRate = total > 0 
      ? Math.round((this.metrics.cache.hits / total) * 100) 
      : 0;
  }

  /**
   * Track rate limit event
   */
  trackRateLimit(type, ip) {
    if (type === 'blocked') {
      this.metrics.rateLimit.blocked++;
    } else if (type === 'slowed') {
      this.metrics.rateLimit.slowed++;
    }

    // Track by IP
    this.metrics.rateLimit.byIP[ip] = this.metrics.rateLimit.byIP[ip] || { blocked: 0, slowed: 0 };
    this.metrics.rateLimit.byIP[ip][type]++;

    // Keep only top 20 IPs
    const topIPs = Object.entries(this.metrics.rateLimit.byIP)
      .sort((a, b) => (b[1].blocked + b[1].slowed) - (a[1].blocked + a[1].slowed))
      .slice(0, 20);
    
    this.metrics.rateLimit.byIP = Object.fromEntries(topIPs);
  }

  /**
   * Track error
   */
  trackError(error, req) {
    this.metrics.errors.total++;

    // Track by error code
    const code = error.code || 'UNKNOWN';
    this.metrics.errors.byCode[code] = (this.metrics.errors.byCode[code] || 0) + 1;

    // Track by endpoint
    const endpoint = this.normalizeEndpoint(req.path);
    this.metrics.errors.byEndpoint[endpoint] = 
      (this.metrics.errors.byEndpoint[endpoint] || 0) + 1;

    // Store recent errors
    this.metrics.errors.recent.unshift({
      message: error.message,
      code,
      endpoint,
      timestamp: new Date().toISOString(),
      statusCode: error.statusCode || 500
    });

    // Keep only last 20 errors
    if (this.metrics.errors.recent.length > 20) {
      this.metrics.errors.recent.pop();
    }
  }

  /**
   * Update system metrics
   */
  updateSystemMetrics() {
    const used = process.memoryUsage();
    
    this.metrics.system.memory = {
      heapUsed: Math.round(used.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(used.heapTotal / 1024 / 1024), // MB
      rss: Math.round(used.rss / 1024 / 1024), // MB
      external: Math.round(used.external / 1024 / 1024) // MB
    };

    this.metrics.system.uptime = Math.round((Date.now() - this.metrics.system.uptime) / 1000);
    
    // CPU usage (basic - percentage of time spent)
    const cpuUsage = process.cpuUsage();
    this.metrics.system.cpu = {
      user: Math.round(cpuUsage.user / 1000), // ms
      system: Math.round(cpuUsage.system / 1000) // ms
    };
  }

  /**
   * Normalize endpoint for grouping
   */
  normalizeEndpoint(path) {
    // Replace dynamic segments with placeholders
    return path
      .replace(/\/[A-Z]{1,5}(?=\/|$)/g, '/:ticker') // Ticker symbols
      .replace(/\/\d+/g, '/:id') // Numeric IDs
      .replace(/\/[a-f0-9-]{32,}/g, '/:hash'); // Hashes
  }

  /**
   * Get all metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      system: {
        ...this.metrics.system,
        uptimeFormatted: this.formatUptime(this.metrics.system.uptime)
      }
    };
  }

  /**
   * Get summary
   */
  getSummary() {
    const metrics = this.getMetrics();
    const totalRequests = metrics.requests.total;
    const errorRate = totalRequests > 0 
      ? ((metrics.errors.total / totalRequests) * 100).toFixed(2) 
      : 0;

    return {
      status: errorRate > 5 ? 'degraded' : 'healthy',
      uptime: metrics.system.uptimeFormatted,
      requests: {
        total: totalRequests,
        successRate: `${100 - errorRate}%`
      },
      performance: {
        avg: `${metrics.performance.avgResponseTime}ms`,
        p95: `${metrics.performance.p95ResponseTime}ms`,
        p99: `${metrics.performance.p99ResponseTime}ms`
      },
      cache: {
        hitRate: `${metrics.cache.hitRate}%`,
        bytesSaved: this.formatBytes(metrics.cache.bytesSaved)
      },
      errors: {
        total: metrics.errors.total,
        rate: `${errorRate}%`
      }
    };
  }

  /**
   * Format uptime
   */
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  }

  /**
   * Format bytes
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Reset metrics
   */
  reset() {
    const uptime = this.metrics.system.uptime;
    this.metrics = {
      requests: {
        total: 0,
        byEndpoint: {},
        byStatus: { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 }
      },
      performance: {
        responseTimes: [],
        slowQueries: [],
        avgResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0,
        bytesSaved: 0
      },
      rateLimit: {
        blocked: 0,
        slowed: 0,
        byIP: {}
      },
      errors: {
        total: 0,
        byCode: {},
        byEndpoint: {},
        recent: []
      },
      system: {
        uptime,
        memory: {},
        cpu: {}
      }
    };
  }
}

// Singleton instance
let monitoringInstance = null;

export function getMonitoringService() {
  if (!monitoringInstance) {
    monitoringInstance = new MonitoringService();
  }
  return monitoringInstance;
}

export default MonitoringService;

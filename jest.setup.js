import '@testing-library/jest-dom'

// Mock environment variables for tests
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.ADMIN_PASSWORD = 'test-password'
process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-api-key'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'

// Mock fetch globally
global.fetch = jest.fn()

// Mock Next.js Request for API testing
global.Request = class MockRequest {
  constructor(url, options = {}) {
    const parsedUrl = new URL(url);
    this.method = options.method || 'GET';
    this.headers = new Headers(options.headers || {});
    this.body = options.body;
    
    // Make url a getter to match NextRequest
    Object.defineProperty(this, 'url', {
      get: () => url,
      enumerable: true,
      configurable: true
    });
    
    // Make nextUrl a getter to match NextRequest
    Object.defineProperty(this, 'nextUrl', {
      get: () => ({
        pathname: parsedUrl.pathname,
        searchParams: parsedUrl.searchParams,
        search: parsedUrl.search,
        href: url,
      }),
      enumerable: true,
      configurable: true
    });
  }
  
  json() {
    return Promise.resolve(this.body ? JSON.parse(this.body) : {});
  }
};

global.Response = class MockResponse {
  constructor(body, options = {}) {
    this.body = body;
    this.status = options.status || 200;
    this.headers = new Map(Object.entries(options.headers || {}));
  }
  
  json() {
    return Promise.resolve(typeof this.body === 'string' ? JSON.parse(this.body) : this.body);
  }
  
  static json(data, init = {}) {
    return new MockResponse(JSON.stringify(data), init);
  }
};

// Mock NextResponse
global.NextResponse = {
  json: (data, init = {}) => {
    return new global.Response(JSON.stringify(data), init);
  },
};

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
    toString: jest.fn(),
  }),
  usePathname: () => '/test',
}))

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'unauthenticated' }),
  signIn: jest.fn(),
  signOut: jest.fn(),
  SessionProvider: ({ children }) => children,
}))

// Mock next-auth/next
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}))

// Mock Prisma
jest.mock('./src/shared/services/prisma', () => ({
  prisma: {
    redditPost: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    opportunity: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
  },
}))

// Mock jest functions to avoid TypeScript errors
const mockFn = () => ({
  mockResolvedValue: jest.fn(),
  mockResolvedValueOnce: jest.fn(),
  mockRejectedValue: jest.fn(),
  mockRejectedValueOnce: jest.fn(),
  mockReturnValue: jest.fn(),
  mockReturnValueOnce: jest.fn(),
  mockImplementation: jest.fn(),
  mockImplementationOnce: jest.fn(),
  mockReset: jest.fn(),
  mockRestore: jest.fn(),
  mockClear: jest.fn(),
})

// Override the prisma mock to include jest mock functions
jest.doMock('./src/shared/services/prisma', () => ({
  prisma: {
    redditPost: {
      findMany: Object.assign(jest.fn(), mockFn()),
      findFirst: Object.assign(jest.fn(), mockFn()),
      findUnique: Object.assign(jest.fn(), mockFn()),
      create: Object.assign(jest.fn(), mockFn()),
      update: Object.assign(jest.fn(), mockFn()),
      delete: Object.assign(jest.fn(), mockFn()),
      count: Object.assign(jest.fn(), mockFn()),
      groupBy: Object.assign(jest.fn(), mockFn()),
    },
    opportunity: {
      findMany: Object.assign(jest.fn(), mockFn()),
      findFirst: Object.assign(jest.fn(), mockFn()),
      findUnique: Object.assign(jest.fn(), mockFn()),
      create: Object.assign(jest.fn(), mockFn()),
      update: Object.assign(jest.fn(), mockFn()),
      delete: Object.assign(jest.fn(), mockFn()),
      count: Object.assign(jest.fn(), mockFn()),
      groupBy: Object.assign(jest.fn(), mockFn()),
    },
  },
}))

// Mock Inngest
jest.mock('./src/shared/services/inngest', () => ({
  inngest: {
    send: jest.fn(),
    createFunction: jest.fn(),
  },
}))

// Reset mocks after each test
afterEach(() => {
  jest.clearAllMocks()
})
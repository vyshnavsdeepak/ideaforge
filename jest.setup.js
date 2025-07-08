import '@testing-library/jest-dom'

// Mock environment variables for tests
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.ADMIN_PASSWORD = 'test-password'
process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-api-key'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'

// Mock fetch globally
global.fetch = jest.fn()

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
jest.mock('./src/lib/prisma', () => ({
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
jest.doMock('./src/lib/prisma', () => ({
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
jest.mock('./src/lib/inngest', () => ({
  inngest: {
    send: jest.fn(),
    createFunction: jest.fn(),
  },
}))

// Reset mocks after each test
afterEach(() => {
  jest.clearAllMocks()
})
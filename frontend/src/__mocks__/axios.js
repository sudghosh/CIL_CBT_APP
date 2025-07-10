export default {
  create: jest.fn(() => ({
    post: jest.fn(),
    get: jest.fn(),
    defaults: {},
    interceptors: {
      request: {},
      response: {}
    }
  })),
  isAxiosError: jest.fn(),
  post: jest.fn(),
  get: jest.fn(),
  defaults: {},
  interceptors: {
    request: {},
    response: {}
  }
};

export const isAxiosError = jest.fn();
export const create = jest.fn();

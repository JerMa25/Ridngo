import { ERROR_MESSAGES } from './error-messages';

export const errorHandler = (
  error: any,
  context?: 'auth' | 'ride' | 'payment'
): string => {

  if (!error.response) {
    return ERROR_MESSAGES.NETWORK;
  }

  const status = error.response.status;

  switch (context) {

    case 'auth':
      switch (status) {
        case 401:
        case 400:
          return ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS;

        case 409:
          return ERROR_MESSAGES.AUTH.ACCOUNT_EXISTS;

        default:
          return ERROR_MESSAGES.SERVER;
      }

    case 'ride':
      switch (status) {
        case 404:
          return ERROR_MESSAGES.RIDE.NOT_FOUND;

        default:
          return ERROR_MESSAGES.SERVER;
      }

    default:
      return ERROR_MESSAGES.SERVER;
  }
};
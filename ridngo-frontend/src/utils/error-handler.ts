import { ERROR_MESSAGES } from './error-messages';

export const handleApiError = (
  error: any,
  context?: 'auth' | 'ride' | 'payment'
): string => {

  if (!error.response) {
    return ERROR_MESSAGES.NETWORK;
  }

  const status = error.response.status;
  // Spring ProblemDetail met le message dans `detail` ; on garde `message` en repli
  // au cas où un endpoint renverrait un format différent.
  const backendDetail: string | undefined =
    error.response.data?.detail || error.response.data?.message;

  switch (context) {

    case 'auth':
      switch (status) {
        case 409:
          // Doublon (username / email / téléphone) — le backend précise déjà lequel.
          return backendDetail || ERROR_MESSAGES.AUTH.ACCOUNT_EXISTS;

        case 400:
          // Login : identifiants invalides. Inscription : données invalides (mot de passe
          // trop faible, champ manquant...) — pas le même message, on privilégie celui du backend.
          return backendDetail || ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS;

        case 401:
          return backendDetail || ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS;

        default:
          return backendDetail || ERROR_MESSAGES.SERVER;
      }

    case 'ride':
      switch (status) {
        case 404:
          return ERROR_MESSAGES.RIDE.NOT_FOUND;

        default:
          return backendDetail || ERROR_MESSAGES.SERVER;
      }

    default:
      return backendDetail || ERROR_MESSAGES.SERVER;
  }
};
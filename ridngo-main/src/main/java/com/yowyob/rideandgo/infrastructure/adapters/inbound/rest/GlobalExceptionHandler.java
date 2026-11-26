package com.yowyob.rideandgo.infrastructure.adapters.inbound.rest;

import com.yowyob.rideandgo.domain.exception.AuthenticationFailedException;
import com.yowyob.rideandgo.domain.exception.OfferNotFoundException;
import com.yowyob.rideandgo.domain.exception.UserAlreadyExistsException;
import com.yowyob.rideandgo.domain.exception.OfferStatutNotMatchException;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(OfferNotFoundException.class)
    public ProblemDetail handleOfferNotFound(OfferNotFoundException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, e.getMessage());
    }

    @ExceptionHandler(AuthenticationFailedException.class)
    public ProblemDetail handleAuthenticationFailed(AuthenticationFailedException e) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, e.getMessage());
        problemDetail.setTitle("Échec d'authentification");
        return problemDetail;
    }

    @ExceptionHandler(com.yowyob.rideandgo.domain.exception.MfaRequiredException.class)
    public org.springframework.http.ResponseEntity<java.util.Map<String, String>> handleMfaRequired(
            com.yowyob.rideandgo.domain.exception.MfaRequiredException e) {
        return org.springframework.http.ResponseEntity.status(HttpStatus.ACCEPTED).body(java.util.Map.of(
                "nextStep", "CONFIRM_MFA",
                "mfaToken", e.getMfaToken(),
                "channel", e.getChannel() == null ? "EMAIL" : e.getChannel()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ProblemDetail handleIllegalState(IllegalStateException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, e.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ProblemDetail handleIllegalArgument(IllegalArgumentException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, e.getMessage());
    }

    @ExceptionHandler(OfferStatutNotMatchException.class)
    public ProblemDetail handleStatutMatch(OfferStatutNotMatchException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, e.getMessage());
    }

    @ExceptionHandler(UserAlreadyExistsException.class)
    public ProblemDetail handleUserAlreadyExists(UserAlreadyExistsException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, e.getMessage());
    }

    @ExceptionHandler(com.yowyob.rideandgo.domain.exception.InvalidRegistrationDataException.class)
    public ProblemDetail handleInvalidRegistrationData(
            com.yowyob.rideandgo.domain.exception.InvalidRegistrationDataException e) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, e.getMessage());
        problemDetail.setTitle("Données d'inscription invalides");
        return problemDetail;
    }

    @ExceptionHandler(com.yowyob.rideandgo.domain.exception.WalletNotFoundException.class)
    public ProblemDetail handleWalletNotFound(com.yowyob.rideandgo.domain.exception.WalletNotFoundException e) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, e.getMessage());
        problemDetail.setTitle("Portefeuille introuvable");
        return problemDetail;
    }

    @ExceptionHandler(com.yowyob.rideandgo.domain.exception.DriverProfileNotValidatedException.class)
    public ProblemDetail handleDriverNotValidated(
            com.yowyob.rideandgo.domain.exception.DriverProfileNotValidatedException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, e.getMessage());
    }

    // Kernel / services externes injoignables : 503 explicite au lieu d'un 500 générique
    @ExceptionHandler(org.springframework.web.reactive.function.client.WebClientRequestException.class)
    public ProblemDetail handleUpstreamUnavailable(Exception e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.SERVICE_UNAVAILABLE,
                "Service externe momentanément indisponible, réessayez dans quelques instants.");
    }
}

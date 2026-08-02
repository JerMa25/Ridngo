package com.yowyob.rideandgo.domain.exception;

/**
 * Données d'inscription invalides (champ manquant, format incorrect, mot de
 * passe trop
 * faible, etc.) — distinct d'un doublon (UserAlreadyExistsException, 409) et
 * d'une panne
 * technique réelle (qui doit rester en 500). Se mappe sur 400 Bad Request.
 */
public class InvalidRegistrationDataException extends RuntimeException {
    public InvalidRegistrationDataException(String message) {
        super(message);
    }
}
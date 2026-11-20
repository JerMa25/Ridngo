package com.yowyob.rideandgo.infrastructure.adapters.inbound.rest;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Mono;

import java.util.Set;

/** Refuse les fichiers uploadés qui ne sont ni image ni PDF (la taille est bornée par spring.webflux.multipart). */
final class UploadValidator {
    private static final Set<String> ALLOWED = Set.of("image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "application/pdf");

    private UploadValidator() {
    }

    static Mono<Void> check(FilePart file) {
        if (file == null) {
            return Mono.empty();
        }
        MediaType type = file.headers().getContentType();
        if (type == null || !ALLOWED.contains(type.getType() + "/" + type.getSubtype())) {
            return Mono.error(new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "Type de fichier non autorisé (images ou PDF uniquement)"));
        }
        return Mono.empty();
    }
}

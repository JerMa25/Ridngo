package com.yowyob.rideandgo.domain.ports.out;

import com.yowyob.rideandgo.domain.model.User;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import java.util.UUID;

public interface ExternalUserPort {
    // Read
    Flux<User> fetchAllRemoteUsers(); // Récupère ceux du service par défaut

    Flux<User> fetchAllRemoteUsersByService(String serviceName); // Récupère pour un service spécifique

    Mono<User> fetchRemoteUserById(UUID id);

    /**
     * Récupère le profil de l'utilisateur actuellement authentifié.
     * Contrairement à fetchRemoteUserById (GET /api/users/{id}), le Kernel Core
     * ne dérive firstName/lastName/profession depuis l'Actor QUE sur GET
     * /api/users/me.
     * userId est conservé pour les implémentations locales/fake qui ont besoin d'un
     * id explicite.
     */
    Mono<User> fetchMyProfile(UUID userId);

    // Write (Propagation)
    Mono<Void> addRole(UUID userId, String roleName);

    Mono<Void> removeRole(UUID userId, String roleName);

    Mono<User> updateProfile(UUID userId, String firstName, String lastName, String phone);

    Mono<Void> changePassword(UUID userId, String currentPassword, String newPassword);

    /** Dépose la photo dans le Kernel (et la déclare comme avatar) ; renvoie l'id du fichier. */
    Mono<String> uploadProfilePhoto(org.springframework.http.codec.multipart.FilePart photo);

    Mono<FileContent> fetchProfilePhoto(String fileId);

    record FileContent(byte[] bytes, String contentType) {
    }
}
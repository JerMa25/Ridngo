package com.yowyob.rideandgo.domain.exception;

/** Le Kernel exige un code de second facteur avant d'émettre la session (select-context → 202 CONFIRM_MFA). */
public class MfaRequiredException extends RuntimeException {
    private final String mfaToken;
    private final String channel;

    public MfaRequiredException(String mfaToken, String channel) {
        super("Code de vérification requis.");
        this.mfaToken = mfaToken;
        this.channel = channel;
    }

    public String getMfaToken() {
        return mfaToken;
    }

    public String getChannel() {
        return channel;
    }
}

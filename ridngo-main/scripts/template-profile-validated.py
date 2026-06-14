import requests
import json

# CONFIGURATION
# Remplacez par l'URL réelle de votre service de notification
NOTIFICATION_SERVICE_URL = "https://notification-service.pynfi.com/api/v1/templates" 
SERVICE_TOKEN = "a77599d3-8de7-4d52-b9d0-2202b2e13a9e" # Token obtenu lors de l'enregistrement du service Ride&Go

# --- STYLES (CSS Inliné pour emails) ---
HEADER_STYLE = "background-color: #4CAF50; color: white; padding: 20px; text-align: center; font-family: Arial, sans-serif;"
BODY_STYLE = "padding: 20px; font-family: Arial, sans-serif; color: #333; line-height: 1.6;"
BUTTON_STYLE = "background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;"
FOOTER_STYLE = "background-color: #f4f4f4; color: #888; padding: 15px; text-align: center; font-size: 12px; font-family: Arial, sans-serif;"
CARD_STYLE = "border: 1px solid #ddd; border-radius: 8px; padding: 15px; background-color: #f9f9f9; margin: 15px 0;"

def get_html_wrapper(title, content):
    return f"""
    <!DOCTYPE html>
    <html>
    <body style="margin: 0; padding: 0; background-color: #ffffff;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
                <td align="center">
                    <table width="600" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #e0e0e0;">
                        <tr><td style="{HEADER_STYLE}"><h1 style="margin:0;">Ride & Go</h1><p style="margin:5px 0 0;">{title}</p></td></tr>
                        <tr><td style="{BODY_STYLE}">{content}</td></tr>
                        <tr><td style="{FOOTER_STYLE}">&copy; 2026 Ride & Go. Tous droits réservés.</td></tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

# --- LISTE DES TEMPLATES À CRÉER ---

templates_to_create = [
    {
        "key": "admin-validation",
        "payload": {
            "name": "Account Validated (Driver)",
            "description": "Notification lorsque le compte chauffeur est validé par un admin",
            "type": "EMAIL",
            "fromEmail": "noreply@rideandgo.com",
            "subject": "✅ Votre compte chauffeur est validé !",
            "message": "Bienvenue dans l'équipe",
            "bodyHtml": get_html_wrapper("Compte Validé", """
                <p>Félicitations ! Votre dossier a été examiné et validé par notre équipe.</p>
                <div style="{CARD_STYLE}">
                    <p>Vous pouvez dès maintenant passer en mode <strong>EN LIGNE</strong> et commencer à recevoir des courses.</p>
                </div>
                <div style="text-align: center;"><a href="rideandgo://drivers/status" style="{BUTTON_STYLE}">Commencer à rouler</a></div>
            """.format(CARD_STYLE=CARD_STYLE, BUTTON_STYLE=BUTTON_STYLE))
        }
    }
]

def deploy_templates():
    headers = {
        "Content-Type": "application/json",
        "X-Service-Token": SERVICE_TOKEN
    }

    print(f"🚀 Déploiement vers {NOTIFICATION_SERVICE_URL}...")
    generated_ids = {}

    for item in templates_to_create:
        key = item['key']
        payload = item['payload']
        
        try:
            print(f"   -> Envoi {key}...")
            response = requests.post(NOTIFICATION_SERVICE_URL, headers=headers, json=payload)
            
            if response.status_code in [200, 201]:
                data = response.json()
                t_id = data.get('templateId') 
                print(f"   ✅ Créé avec ID: {t_id}")
                generated_ids[key] = t_id
            else:
                print(f"   ❌ Erreur {response.status_code}: {response.text}")
        except Exception as e:
            print(f"   ⚠️ Exception: {e}")

    print("\n--- 📋 IDS À COPIER DANS APPLICATION.YML ---")
    print("application:")
    print("  notification:")
    print("    templates:")
    for k, v in generated_ids.items():
        print(f"      {k}: {v}")

if __name__ == "__main__":
    deploy_templates()
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { WebView } from 'react-native-webview';
import { useTheme } from '../../src/context/ThemeContext';
import { rideService } from '../../src/services/rideService';
import { Spacing } from '../../src/types/theme';

export default function DriverHeatmapScreen() {
  const { Colors } = useTheme();
  const [points, setPoints] = useState<[number, number][]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrajectories = async () => {
      try {
        const data = await rideService.getMyTrajectories();
        const allCoords = data.flatMap((t: any) => {
          try {
            return JSON.parse(t.trajectoryDataJson);
          } catch { return []; }
        });
        setPoints(allCoords);
      } catch { /* silent */ }
      finally { setLoading(false); }
    };
    fetchTrajectories();
  }, []);

  const buildMapHTML = () => {
    const pointsJS = JSON.stringify(points.length > 0 ? points : [[3.8480, 11.5021]]); // Yaoundé fallback
    const mapCenter = points.length > 0 ? `[${points[0][0]}, ${points[0][1]}]` : `[3.8480, 11.5021]`;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script src="https://unpkg.com/leaflet.heat/dist/leaflet-heat.js"></script>
        <style>
          html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #1a1a1a; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', {zoomControl: false, attributionControl: false}).setView(${mapCenter}, 13);
          L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);
          
          var points = ${pointsJS};
          if(points.length > 1) {
            var heat = L.heatLayer(points, {
              radius: 25,
              blur: 15,
              maxZoom: 17,
              gradient: {0.4: 'blue', 0.6: 'lime', 0.8: 'yellow', 1.0: 'red'}
            }).addTo(map);
          }
        </script>
      </body>
      </html>
    `;
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: Colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: Colors.card, borderBottomColor: Colors.cardBorder }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: Colors.input }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Ionicons name="flame" size={18} color={Colors.orange} />
            <Text style={[styles.headerTitle, { color: Colors.text }]}>Zones d'Influence</Text>
          </View>
          <Text style={[styles.headerSub, { color: Colors.textMuted }]}>ANALYSE DE VOS TRAJECTOIRES</Text>
        </View>
      </View>

      <View style={styles.mapContainer}>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={Colors.orange} size="large" />
            <Text style={[styles.loadingText, { color: Colors.textMuted }]}>Génération de la carte...</Text>
          </View>
        ) : points.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="map-outline" size={40} color={Colors.textMuted} />
            <Text style={[styles.emptyText, { color: Colors.textMuted }]}>
              Pas assez de données pour générer la carte de chaleur.
            </Text>
          </View>
        ) : (
          <WebView
            originWhitelist={['*']}
            source={{ html: buildMapHTML() }}
            style={styles.map}
            scrollEnabled={false}
            bounces={false}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: Spacing.md, paddingVertical: 14,
    borderBottomWidth: 1, zIndex: 10,
  },
  backBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontWeight: '900', fontSize: 18, letterSpacing: -0.3 },
  headerSub: { fontSize: 9, fontWeight: '700', letterSpacing: 2, marginTop: 2 },
  
  mapContainer: { flex: 1, backgroundColor: '#1a1a1a' },
  map: { flex: 1 },
  
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontWeight: '900', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  emptyText: { textAlign: 'center', fontWeight: '700', fontSize: 14, lineHeight: 20 },
});

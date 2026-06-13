export type UserRole = 'RIDE_AND_GO_PASSENGER' | 'RIDE_AND_GO_DRIVER' | 'RIDE_AND_GO_ADMIN';
export type OfferState = 'PENDING' | 'BID_RECEIVED' | 'DRIVER_SELECTED' | 'VALIDATED' | 'CANCELLED';
export type RideState = 'CREATED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  username: string;
  roles: string[];
  permissions: string[];
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  telephone: string;
  roles: UserRole[];
}

export interface VehicleInfo {
  vehicleMakeName: string;
  vehicleModelName: string;
  vehicleTypeName: string;
  transmissionTypeName: string;
  fuelTypeName: string;
  vehicleSizeName: string;
  manufacturerName: string;
  vehicleSerialNumber: string;
  registrationNumber: string;
  tankCapacity: number;
  luggageMaxCapacity: number;
  totalSeatNumber: number;
  averageFuelConsumptionPerKm: number;
  mileageAtStart: number;
  mileageSinceCommissioning: number;
  vehicleAgeAtStart: number;
}

export interface BecomeDriverRequest {
  vehicle: VehicleInfo;
  licenseNumber: string;
}

export interface UpdateUserProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface Bid {
  driverId: string;
  driverName: string;
  driverPhoto?: string;
  rating: number;
  totalTrips: number;
  eta: number;
  distanceToPassenger: number;
  latitude: number;
  longitude: number;
  brand: string;
  model: string;
  licensePlate: string;
}

export interface OfferResponse {
  id: string;
  passengerId: string;
  selectedDriverId?: string;
  startPoint: string;
  startLat?: number;
  startLon?: number;
  endPoint: string;
  endLat?: number;
  endLon?: number;
  price: number;
  numberOfPlaces: number;
  passengerPhone?: string;
  departureTime?: string;
  state: OfferState;
  bids: Bid[];
}

export interface LandingOfferResponse {
  startPoint: string;
  endPoint: string;
  startLat?: number;
  startLon?: number;
  endLat?: number;
  endLon?: number;
  price: number;
  numberOfPlaces: number;
  departureTime?: string;
  createdAt?: string;
}

export interface RideResponse {
  id: string;
  offerId: string;
  driverId: string;
  passengerId: string;
  distance: number;
  duration: number;
  state: RideState;
}

export interface FareResponse {
  prix_moyen: number;
  prix_min: number;
  prix_max: number;
  distance: number;
  duree: number;
}

// -- Notifications

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  dataJson?: string;
}

export interface PagedResultNotification {
  content: Notification[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
}

export interface NotificationSettings {
  userId: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  whatsappEnabled: boolean;
}

export interface SettingsDto {
  email: boolean;
  sms: boolean;
  push: boolean;
  whatsapp: boolean;
}

export interface Wallet {
  id: string;
  ownerId: string;
  ownerName: string;
  balance: number;
}

export interface DriverProfile {
  userId: string;
  status: string;
  licenseNumber: string;
  isOnline: boolean;
  isProfileValidated: boolean;
  isSyndicated: boolean;
  isProfileCompleted: boolean;
  vehicle?: Vehicle;
}

export interface Vehicle {
  id: string;
  makeName: string;
  modelName: string;
  registrationNumber: string;
  brand: string;
  typeName: string;
  fuelTypeName: string;
  transmissionType: string;
  totalSeatNumber: number;
}

export interface CreateOfferRequest {
  startPoint: string;
  startLat: number; // Nouveau
  startLon: number; // Nouveau
  endLat: number; // Nouveau
  endLon: number; // Nouveau
  endPoint: string;
  price: number;
  numberOfPlaces: number;
  passengerPhone: string;
  departureTime: string;
}

export interface FareRequest {
  depart: string;
  arrivee: string;
  heure: string;
  meteo: number;
  type_zone: number;
  congestion_user: number;
}

export interface RideTrackingResponse {
  latitude: number;
  longitude: number;
  distanceKm: number;
  etaMinutes: number;
  targetRole: string;
}

export interface DriverTrajectory {
  id: string;
  driverId: string;
  startTime: string;
  endTime: string;
  pointsCount: number;
  trajectoryDataJson: string; // Contient le tableau de coordonnées [[lat, lon], ...]
}
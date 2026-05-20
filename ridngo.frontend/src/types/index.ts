export type UserRole = 'PASSENGER' | 'DRIVER' | 'ADMIN';

export type RideStatus = 'SEARCHING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface Ride {
  id: string;
  passengerId: string;
  passengerName: string;
  driverId?: string;
  driverName?: string;
  from: string;
  to: string;
  price: number;
  status: RideStatus;
  createdAt: string;
  distance: string;
  duration: string;
}

export interface LocationCoords {
  lat: string;
  lon: string;
  display_name: string;
}
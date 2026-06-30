/* eslint-disable @typescript-eslint/no-explicit-any */

export const formatAddress = (addressObj: any): string => {
  if (!addressObj) return '';
  const road = addressObj.road || addressObj.pedestrian || addressObj.highway;
  const neighborhood = addressObj.suburb || addressObj.neighbourhood || addressObj.city_district;
  const city = addressObj.city || addressObj.town || addressObj.village;

  const parts: string[] = [];
  if (road) parts.push(road);
  if (neighborhood) parts.push(neighborhood);
  if (city && city !== neighborhood) parts.push(city);

  return parts.length > 0 ? parts.join(', ') : 'Ma position';
};

export const reverseGeocode = async (latitude: number, longitude: number): Promise<string> => {
  const baseUrl = process.env.NEXT_PUBLIC_OSM_BASE_URL;
  const res = await fetch(
    `${baseUrl}/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&accept-language=fr`
  );
  const data = await res.json();
  return formatAddress(data.address) || 'Ma position';
};

export interface UserLocation {
  label: string;
  lat: number;
  lon: number;
}

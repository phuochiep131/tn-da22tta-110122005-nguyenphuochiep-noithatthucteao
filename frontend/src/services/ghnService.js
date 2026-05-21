import api from "../config/api";

const CACHE_TTL = 30 * 60 * 1000;
const REQUEST_TIMEOUT = 10000;
const responseCache = new Map();
const pendingRequests = new Map();

const debug = (...args) => console.debug("[GHN]", ...args);

const normalizeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const getCached = (key) => {
  const cached = responseCache.get(key);
  if (!cached || Date.now() > cached.expiresAt) return null;
  debug("cache hit", key);
  return cached.value;
};

const runCachedRequest = (key, requestFn) => {
  const cached = getCached(key);
  if (cached) return Promise.resolve(cached);

  if (pendingRequests.has(key)) {
    debug("join pending request", key);
    return pendingRequests.get(key);
  }

  const request = requestFn()
    .then((value) => {
      responseCache.set(key, {
        value,
        expiresAt: Date.now() + CACHE_TTL,
      });
      return value;
    })
    .finally(() => pendingRequests.delete(key));

  pendingRequests.set(key, request);
  return request;
};

export const isGhnRequestCanceled = (error) =>
  error?.code === "ERR_CANCELED" || error?.name === "CanceledError";

export const extractGhnError = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Khong the ket noi GHN";

export const getProvinces = () =>
  runCachedRequest("provinces", async () => {
    debug("load provinces");
    const { data } = await api.get("/api/ghn/provinces", {
      timeout: REQUEST_TIMEOUT,
    });
    return Array.isArray(data) ? data : [];
  });

export const getDistricts = (provinceId) => {
  const normalizedProvinceId = normalizeNumber(provinceId);
  if (!normalizedProvinceId) return Promise.resolve([]);

  return runCachedRequest(`districts:${normalizedProvinceId}`, async () => {
    debug("load districts", { provinceId: normalizedProvinceId });
    const { data } = await api.get("/api/ghn/districts", {
      params: { provinceId: normalizedProvinceId },
      timeout: REQUEST_TIMEOUT,
    });
    return Array.isArray(data) ? data : [];
  });
};

export const getWards = (districtId) => {
  const normalizedDistrictId = normalizeNumber(districtId);
  if (!normalizedDistrictId) return Promise.resolve([]);

  return runCachedRequest(`wards:${normalizedDistrictId}`, async () => {
    debug("load wards", { districtId: normalizedDistrictId });
    const { data } = await api.get("/api/ghn/wards", {
      params: { districtId: normalizedDistrictId },
      timeout: REQUEST_TIMEOUT,
    });
    return Array.isArray(data) ? data : [];
  });
};

export const getAvailableServices = (toDistrictId, signal) => {
  const normalizedDistrictId = normalizeNumber(toDistrictId);
  if (!normalizedDistrictId) return Promise.resolve([]);

  return runCachedRequest(`services:${normalizedDistrictId}`, async () => {
    debug("load available services", { toDistrictId: normalizedDistrictId });
    const { data } = await api.get("/api/ghn/available-services", {
      params: { toDistrictId: normalizedDistrictId },
      timeout: REQUEST_TIMEOUT,
      signal,
    });
    return Array.isArray(data) ? data : [];
  });
};

export const calculateShippingFee = (payload, signal) => {
  const normalizedPayload = {
    toDistrictId: normalizeNumber(payload?.toDistrictId),
    toWardCode: String(payload?.toWardCode || ""),
    serviceId: normalizeNumber(payload?.serviceId),
    height: normalizeNumber(payload?.height),
    length: normalizeNumber(payload?.length),
    weight: normalizeNumber(payload?.weight),
    width: normalizeNumber(payload?.width),
    insuranceValue: normalizeNumber(payload?.insuranceValue),
  };

  if (!normalizedPayload.toDistrictId || !normalizedPayload.toWardCode) {
    return Promise.reject(new Error("Dia chi GHN chua hop le"));
  }

  const cacheKey = `fee:${JSON.stringify(normalizedPayload)}`;
  return runCachedRequest(cacheKey, async () => {
    debug("calculate shipping fee", normalizedPayload);
    const { data } = await api.post("/api/ghn/fee", normalizedPayload, {
      timeout: REQUEST_TIMEOUT,
      signal,
    });
    return data;
  });
};

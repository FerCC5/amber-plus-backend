import * as store from '../store/index.js'

export const initStore = store.initStore
export const listAlerts = store.listAlerts
export const getAlert = store.getAlert
export const getAlertDetail = store.getAlertDetail
export const createAlert = store.createAlert
export const countAlertsCreatedToday = store.countAlertsCreatedToday
export const updateAlertStatus = store.updateAlertStatus
export const updateAlertPhoto = store.updateAlertPhoto
export const updateAlertBlockchain = store.updateAlertBlockchain
export const updateAlertAiScores = store.updateAlertAiScores
export const listBlockchainAlerts = store.listBlockchainAlerts
export const findAlertByTxHash = store.findAlertByTxHash
export const createSighting = store.createSighting

// Sidebar panel components
// HistoriquePreparer reste à ../HistoriquePreparer pendant la migration.
// HistoryPanel (scaffold) le remplacera dans SC-02E.
export { ResourcePanel } from './ResourcePanel'
export { HistoryPanel } from './HistoryPanel'
export { VersionPanel } from './VersionPanel'
export { SettingsPanel } from './SettingsPanel'

// Re-export du composant existant pour les imports via la nouvelle structure
export { default as HistoriquePreparer } from '../HistoriquePreparer'

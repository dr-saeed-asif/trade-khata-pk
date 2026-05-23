/**
 * Cognitive TPG DLXi — 2-inch model (datasheet).
 * - Max print width: 2.2" (56 mm)
 * - Media width: 1"–2.4" (25–61 mm)
 * - Resolution: 203 dpi (8 dots/mm)
 *
 * Driver (Printing Preferences → Options) must match label stock:
 * - Width: 50 mm | Height: 25 mm (NOT 70×50)
 * - Unprintable: Left 1, Right 1, Top 1, Bottom 1 mm (NOT 10 mm bottom)
 * - Sensor: Gap | Rotate 180°: OFF
 * - Electron dialog: Copies 1, uncheck "Let app change preferences" if misaligned
 * - Advanced → Present Label: Disabled (checkbox ON), Advance 0, Reverse 0 mm
 * - Reverse before print: Present Label ON causes retract — must be Disabled
 * - Blank label before print: Calibrate + confirm Height 25 mm (not 50)
 */
export const DLX_DPI = 203
export const DLX_MAX_PRINT_WIDTH_MM = 56
export const DLX_MEDIA_WIDTH_MIN_MM = 25
export const DLX_MEDIA_WIDTH_MAX_MM = 61

/** User label stock */
export const LABEL_WIDTH_MM = 50
export const LABEL_HEIGHT_MM = 25

export const mmToDots = (mm: number) => Math.round((mm / 25.4) * DLX_DPI)

export const LABEL_WIDTH_PX = mmToDots(LABEL_WIDTH_MM)
export const LABEL_HEIGHT_PX = mmToDots(LABEL_HEIGHT_MM)

/** Microns for Electron webContents.print pageSize */
export const LABEL_WIDTH_MICRONS = LABEL_WIDTH_MM * 1000
export const LABEL_HEIGHT_MICRONS = LABEL_HEIGHT_MM * 1000

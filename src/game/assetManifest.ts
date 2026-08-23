export const IMAGE_ASSETS: Record<string, string> = {
  'title-cover': 'assets/title_cover_figJma.png',
  'title-plate': 'assets/title_start_plate.png',
  'time-vortex': 'assets/time_vortex.png',
  'bgnarator': 'assets/bgnarator.png',
  'bg1944-far': 'assets/bg1944_far.png',
  'bg1944-mid': 'assets/bg1944_mid.png',
  'bg1944-fg': 'assets/bg1944_fg.png',
  'bg1968A-far': 'assets/bg1968A_far.png',
  'bg1968A-mid': 'assets/bg1968A_mid.png',
  'bg1968A-fg': 'assets/bg1968A_fg.png',
  'bg1968B-far': 'assets/bg1968B_far.png',
  'bg1968B-mid': 'assets/bg1968B_mid.png',
  'bg1968B-fg': 'assets/bg1968B_fg.png',
  'bg1999-far': 'assets/bg1999_far.png',
  'bg1999-mid': 'assets/bg1999_mid.png',
  'bg1999-fg': 'assets/bg1999_fg.png',
  'watch-repair-art': 'assets/Arlogirusak.png',
  'rose-bottle-broken': 'assets/botolmawar.png',
  'water-gem-art': 'assets/permata.jpg',
  'elena-arthur-photo': 'assets/fotoelenaathur.  Background.png',
  'bonus-puzzle-board': 'assets/bonus_puzzle_board.jpg',
  'bonus-city-complete': 'assets/bonus_city_complete.jpg',
};

export const BONUS_IMAGE_ASSETS: Record<string, string> = {
  'bg2088-far': 'assets/bg2088_far.png',
  'bg2088-near': 'assets/bg2088_near.png',
  'bg2088-fg': 'assets/bg2088_fg.png',
  'bonus-diff-art': 'assets/mencariperbedaan .png',
  'bonus-mawar-art': 'assets/mawar.jpg',
  'bonus-mawar2-art': 'assets/mawar2.jpg',
  'bonus-dinner-bg': 'assets/makan.jpg',
  'food-spaghetti': 'assets/spaggeti.jpg',
  'food-nasi': 'assets/nasigoreng.jpg',
  'food-udang': 'assets/udangkeju.jpg',
  'food-steak': 'assets/steak.jpg',
  'bonus-cats-art': 'assets/kucing.jpg',
  'bonus-chem-glass': 'assets/gelaskimia.jpg',
  'bonus-love-glass': 'assets/gelashati.jpg',
};

export const PROP_SHEET_ASSETS: Record<string, string> = {
  'prop-flag1944': 'assets/prop_flag1944.png',
  'prop-lantern1944': 'assets/prop_lantern1944.png',
  'prop-flare1944': 'assets/prop_flare1944.png',
  'prop-bulb1968A': 'assets/prop_bulb1968A.png',
  'prop-radio1968A': 'assets/prop_radio1968A.png',
  'prop-beacon1968B': 'assets/prop_beacon1968B.png',
  'prop-steam1968B': 'assets/prop_steam1968B.png',
  'prop-consoleWave1999': 'assets/prop_consoleWave1999.png',
  'prop-frost1999': 'assets/prop_frost1999.png',
};

export const BONUS_PROP_SHEET_ASSETS: Record<string, string> = {
  'prop-barrel2088': 'assets/prop_barrel2088.png',
  'prop-poster2088': 'assets/prop_poster2088.png',
};

export const CHARACTER_SHEET_ASSETS: Record<string, string> = {
  'elena': 'assets/elena_sheet.png',
  'arthur-muda': 'assets/arthur_muda_sheet.png',
  'arthur-dewasa': 'assets/arthur_dewasa_sheet.png',
  'arthur-buron': 'assets/arthur_buron_sheet.png',
  'arthur-tua': 'assets/arthur_tua_sheet.png',
};

export const AUDIO_ASSETS: Record<string, string> = {
  'step-mud-0': 'assets/audio/footstep00.wav',
  'step-mud-1': 'assets/audio/footstep03.wav',
  'step-metal': 'assets/audio/footstep08.wav',
  'flip': 'assets/audio/bookFlip1.wav',
  'flip2': 'assets/audio/bookFlip2.wav',
  'click': 'assets/audio/metalClick.wav',
  'rain': 'assets/audio/rain.wav',
  'wind': 'assets/audio/wind.wav',
  'fire': 'assets/audio/fire.wav',
  'hum': 'assets/audio/hum.wav',
};

export const STATIC_ASSETS = [
  ...Object.values(IMAGE_ASSETS),
  ...Object.values(BONUS_IMAGE_ASSETS),
  ...Object.values(PROP_SHEET_ASSETS),
  ...Object.values(BONUS_PROP_SHEET_ASSETS),
  ...Object.values(CHARACTER_SHEET_ASSETS),
  ...Object.values(AUDIO_ASSETS),
  'assets/intro.mp4',
  'assets/fonts/cinzel.ttf',
  'assets/fonts/poppins-regular.ttf',
  'assets/fonts/patrick-hand.woff2',
  'assets/fonts/OFL-Cinzel-Poppins.txt',
] as const;

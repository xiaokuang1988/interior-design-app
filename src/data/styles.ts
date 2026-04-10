import { StylePreset, FloorType } from '@/types';

export const stylePresets: StylePreset[] = [
  {
    id: 'nordic', name: '北欧风格', nameEn: 'Nordic',
    description: '简约、明亮、自然木质元素，强调功能性和舒适感',
    wallColor: '#F5F5F0', floorType: 'wood', floorColor: '#D4B896',
    accentColors: ['#4A6741', '#2563EB', '#F5E6D3', '#1F2937'], thumbnail: '🇸🇪',
  },
  {
    id: 'japanese', name: '日式风格', nameEn: 'Japanese',
    description: '和风禅意，榻榻米、障子、木质温暖，追求自然和谐',
    wallColor: '#F5F0E8', floorType: 'tatami', floorColor: '#C4B698',
    accentColors: ['#8B4513', '#2D5016', '#D4A574', '#F5F0E8'], thumbnail: '🇯🇵',
  },
  {
    id: 'chinese', name: '中式风格', nameEn: 'Chinese',
    description: '传统中式美学，红木家具、山水画、对称布局',
    wallColor: '#FAF3E0', floorType: 'wood', floorColor: '#8B4513',
    accentColors: ['#8B0000', '#DAA520', '#2F4F4F', '#8B4513'], thumbnail: '🇨🇳',
  },
  {
    id: 'modern', name: '现代简约', nameEn: 'Modern Minimalist',
    description: '干净线条、中性色调、几何造型，少即是多',
    wallColor: '#FFFFFF', floorType: 'tile', floorColor: '#9CA3AF',
    accentColors: ['#000000', '#6B7280', '#3B82F6', '#FFFFFF'], thumbnail: '🏢',
  },
  {
    id: 'industrial', name: '工业风格', nameEn: 'Industrial',
    description: '裸露管道、水泥质感、金属元素、粗犷美感',
    wallColor: '#D1D5DB', floorType: 'concrete', floorColor: '#6B7280',
    accentColors: ['#374151', '#92400E', '#DC2626', '#1F2937'], thumbnail: '🏭',
  },
  {
    id: 'wabi-sabi', name: '侘寂风格', nameEn: 'Wabi-Sabi',
    description: '接受不完美、朴素之美，自然材质、低饱和色彩',
    wallColor: '#E8E0D4', floorType: 'wood', floorColor: '#A89278',
    accentColors: ['#8B7355', '#6B5B48', '#D4C4B0', '#F5EDE0'], thumbnail: '🍵',
  },
];

export const wallColorPresets = [
  { name: '纯白', color: '#FFFFFF' }, { name: '暖白', color: '#FAF3E0' },
  { name: '浅灰', color: '#F3F4F6' }, { name: '中灰', color: '#D1D5DB' },
  { name: '奶油', color: '#F5F0E8' }, { name: '薄荷', color: '#D1FAE5' },
  { name: '浅蓝', color: '#DBEAFE' }, { name: '薰衣草', color: '#E9D5FF' },
  { name: '暖粉', color: '#FCE7F3' }, { name: '沙色', color: '#D4B896' },
  { name: '深灰', color: '#6B7280' }, { name: '深蓝', color: '#1E3A5F' },
];

export const floorPresets: { type: FloorType; name: string; color: string }[] = [
  { type: 'wood', name: '浅色木地板', color: '#D4B896' },
  { type: 'wood', name: '深色木地板', color: '#8B4513' },
  { type: 'wood', name: '橡木地板', color: '#C4A882' },
  { type: 'tile', name: '白色瓷砖', color: '#F3F4F6' },
  { type: 'tile', name: '灰色瓷砖', color: '#9CA3AF' },
  { type: 'tile', name: '米色瓷砖', color: '#D4C4B0' },
  { type: 'carpet', name: '米白地毯', color: '#F5F0E8' },
  { type: 'carpet', name: '灰色地毯', color: '#9CA3AF' },
  { type: 'marble', name: '白色大理石', color: '#E8E0D4' },
  { type: 'concrete', name: '水泥地面', color: '#6B7280' },
  { type: 'tatami', name: '榻榻米', color: '#C4B698' },
];

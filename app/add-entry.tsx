import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  Alert,
  StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';

// Mock interfaces for our UI (these will be replaced by Supabase types later)
interface FoodItem {
  id: string;
  name: string;
  amount: string;
  calories: number;
}

export default function AddEntryScreen() {
  const { meal } = useLocalSearchParams<{ meal: string }>();
  const displayMeal = meal || 'Meal';

  // Local state for UI toggles and inputs
  const [activeTab, setActiveTab] = useState<'foods' | 'recipes'>('foods');
  const [searchQuery, setSearchQuery] = useState('');
  const [addedItems, setAddedItems] = useState<FoodItem[]>([]);

  // Camera state and permissions
  const [isScanning, setIsScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  // Mock data for frequently added foods
  const frequentFoods: FoodItem[] = [
    { id: 'f1', name: 'Apple (Raw)', amount: '1 medium (182g)', calories: 95 },
    { id: 'f2', name: 'Oatmeal', amount: '50g', calories: 185 },
    { id: 'f3', name: 'Almond Milk', amount: '200ml', calories: 30 },
  ];

  // Mock data for user's recipes
  const userRecipes: FoodItem[] = [
    { id: 'r1', name: 'Avocado Toast', amount: '1 portion', calories: 320 },
    { id: 'r2', name: 'Protein Shake', amount: '1 portion', calories: 240 },
  ];

  const handleAddItem = (item: FoodItem) => {
    setAddedItems((prev) => [...prev, item]);
  };

  const handleDone = () => {
    console.log('Saving to DB:', addedItems);

    router.back();
  };

  // Handler for navigating to detail screen (TODO)
  const navigateToDetail = (item: FoodItem) => {
    console.log('Navigate to detail for:', item.name);
    // router.push(`/detail/${item.id}`);
  };

  const handleOpenScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          'Permission Required', 
          'We need access to your camera to scan barcodes.'
        );
        return;
      }
    }
    setIsScanning(true);
  };

  const handleBarcodeScanned = ({ type, data }: { type: string, data: string }) => {
    setIsScanning(false);
    
    setSearchQuery(data);
    
    // 3. Temporary alert (TODO replace with API call later)
    Alert.alert(
      'Barcode Found!', 
      `Scanned code: ${data}\n\nNext step: Fetching this product from Open Food Facts.`
    );
  };

  // If the scanner is active, render ONLY the full-screen camera view
  if (isScanning) {
    return (
      <View className="flex-1 bg-black">
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={handleBarcodeScanned}
          barcodeScannerSettings={{
            // Common formats for groceries
            barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "qr"], 
          }}
        >
          <SafeAreaView className="flex-1 justify-between">
            {/* Top row: Close button */}
            <View className="flex-row justify-end p-4 pt-10">
              <TouchableOpacity 
                onPress={() => setIsScanning(false)} 
                className="bg-black/50 p-2 rounded-full"
              >
                <Ionicons name="close" size={32} color="white" />
              </TouchableOpacity>
            </View>
            
            {/* Bottom row: Instructions */}
            <View className="items-center pb-12">
              <View className="bg-black/60 px-6 py-3 rounded-full">
                <Text className="text-white font-bold text-base">
                  Point at a barcode to scan
                </Text>
              </View>
            </View>
          </SafeAreaView>
        </CameraView>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      
      {/* 1. HEADER */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <Ionicons name="close" size={28} color="#6b7280" />
        </TouchableOpacity>
        
        <View className="items-center">
          <Text className="text-lg font-bold text-gray-800 dark:text-white capitalize">
            {displayMeal}
          </Text>
          <Text className="text-sm text-green-500 font-medium">
            {addedItems.length} items added
          </Text>
        </View>

        <TouchableOpacity 
          onPress={handleDone} 
          className="p-2 -mr-2"
          disabled={addedItems.length === 0}
        >
          <Text className={`text-lg font-bold ${addedItems.length > 0 ? 'text-green-500' : 'text-gray-300 dark:text-gray-600'}`}>
            Done
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2. SEARCH BAR & SCANNER */}
      <View className="px-4 py-4 flex-row items-center gap-x-3">
        <View className="flex-1 flex-row items-center bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3">
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput
            className="flex-1 ml-2 text-base text-gray-800 dark:text-white"
            placeholder="Search foods or brands..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus={true}
          />
        </View>
        <TouchableOpacity
         onPress={handleOpenScanner}
         className="bg-green-100 dark:bg-green-900/30 p-3 rounded-xl items-center justify-center"
        >
          <Ionicons name="barcode-outline" size={24} color="#22c55e" />
        </TouchableOpacity>
      </View>

      {/* 3. TABS (Foods | Recipes) */}
      <View className="flex-row px-4 border-b border-gray-100 dark:border-gray-800">
        <TouchableOpacity 
          className={`flex-1 pb-3 items-center ${activeTab === 'foods' ? 'border-b-2 border-green-500' : ''}`}
          onPress={() => setActiveTab('foods')}
        >
          <Text className={`font-semibold text-base ${activeTab === 'foods' ? 'text-green-500' : 'text-gray-500'}`}>
            Foods
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          className={`flex-1 pb-3 items-center ${activeTab === 'recipes' ? 'border-b-2 border-green-500' : ''}`}
          onPress={() => setActiveTab('recipes')}
        >
          <Text className={`font-semibold text-base ${activeTab === 'recipes' ? 'text-green-500' : 'text-gray-500'}`}>
            Recipes
          </Text>
        </TouchableOpacity>
      </View>

      {/* 4. CONTENT LIST */}
      <ScrollView className="flex-1 px-4 pt-4">
        
        {/* Create Recipe Button (Only visible in Recipes tab) */}
        {activeTab === 'recipes' && (
          <TouchableOpacity className="flex-row items-center justify-center bg-green-50 dark:bg-gray-800 border border-green-200 dark:border-green-900 rounded-xl py-4 mb-6">
            <Ionicons name="add-circle" size={24} color="#22c55e" className="mr-2" />
            <Text className="text-green-600 dark:text-green-400 font-bold text-base ml-2">
              Create New Recipe
            </Text>
          </TouchableOpacity>
        )}

        <Text className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">
          {activeTab === 'foods' ? 'Frequently Added' : 'Your Recipes'}
        </Text>

        {/* Render the appropriate list based on active tab */}
        {(activeTab === 'foods' ? frequentFoods : userRecipes).map((item) => (
          <View 
            key={item.id} 
            className="flex-row items-center justify-between mb-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-50 dark:border-gray-700"
          >
            {/* Clickable area for details */}
            <TouchableOpacity 
              className="flex-1 pr-4" 
              onPress={() => navigateToDetail(item)}
            >
              <Text className="text-base font-bold text-gray-800 dark:text-white mb-1">
                {item.name}
              </Text>
              <View className="flex-row items-center">
                <Text className="text-sm text-gray-500 dark:text-gray-400">
                  {item.amount} • <Text className="text-green-600 dark:text-green-400 font-medium">{item.calories} kcal</Text>
                </Text>
              </View>
            </TouchableOpacity>

            {/* Add Button */}
            <TouchableOpacity 
              className="w-10 h-10 bg-green-50 dark:bg-gray-700 rounded-full items-center justify-center"
              onPress={() => handleAddItem(item)}
            >
              <Ionicons name="add" size={24} color="#22c55e" />
            </TouchableOpacity>
          </View>
        ))}
        
        {/* Extra padding at the bottom so content doesn't get cut off */}
        <View className="h-10" />
      </ScrollView>

    </SafeAreaView>
  );
}
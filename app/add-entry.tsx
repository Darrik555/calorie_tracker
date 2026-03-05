import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { fetchProductByBarcode, searchProductsByText, FetchedFood } from '../src/services/openFoodFacts';
import { useEntryStore } from '../src/store/useEntryStore';
import { supabase } from '../src/services/supabase';

// Mock interfaces for our UI (these will be replaced by Supabase types later)
interface FoodItem {
  id: string;
  name: string;
  amount: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
}

export default function AddEntryScreen() {
  const { meal } = useLocalSearchParams<{ meal: string }>();
  const displayMeal = meal || 'Meal';

  // Local state for UI toggles and inputs
  const [activeTab, setActiveTab] = useState<'foods' | 'recipes'>('foods');
  const [searchQuery, setSearchQuery] = useState('');
  const { stagedItems: addedItems, clearStagedItems, addStagedItem } = useEntryStore();

  // Camera state and permissions
  const [isScanning, setIsScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  // Add a loading state for the API call
  const [isFetchingFood, setIsFetchingFood] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<FetchedFood[]>([]);

  const [isSaving, setIsSaving] = useState(false);

  const [recentFoods, setRecentFoods] = useState<FoodItem[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(true);

  const userRecipes: FoodItem[] = [
    { id: 'r1', name: 'Avocado Toast', amount: '1 portion', calories: 320, carbs: 30, protein: 10, fat: 15 },
    { id: 'r2', name: 'Protein Shake', amount: '1 portion', calories: 240, carbs: 10, protein: 30, fat: 5 },
  ];

  useEffect(() => {
    // Only search if user typed at least 3 characters
    if (searchQuery.length < 3) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    // Set a timer to wait 500ms after the user STOPS typing
    const delayDebounceFn = setTimeout(async () => {
      const results = await searchProductsByText(searchQuery);
      setSearchResults(results);
      setIsSearching(false);
    }, 500);

    // Cleanup function: clears the timer if the user types again before 500ms
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Fetch recently added foods from Supabase on mount
  useEffect(() => {
    async function fetchRecentFoods() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch the last 50 entries for this user, including food details
        const { data, error } = await supabase
          .from('tracking_entries')
          .select(`
            amount_in_grams,
            foods (
              barcode,
              name,
              calories_per_100g,
              carbs_per_100g,
              protein_per_100g,
              fat_per_100g
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;

        // We use a Map to filter out duplicates (we only want unique foods)
        const uniqueFoodsMap = new Map<string, FoodItem>();

        if (data) {
          data.forEach((entry: any) => {
            const food = Array.isArray(entry.foods) ? entry.foods[0] : entry.foods;
            
            // If the food has a barcode and isn't in our map yet
            if (food && food.barcode && !uniqueFoodsMap.has(food.barcode)) {
              
              // Calculate calories for the amount they ate last time
              const amount = entry.amount_in_grams;
              const calcCalories = Math.round((food.calories_per_100g / 100) * amount);
              const calcCarbs = Math.round((food.carbs_per_100g / 100) * amount);
              const calcProtein = Math.round((food.protein_per_100g / 100) * amount);
              const calcFats = Math.round((food.fat_per_100g / 100) * amount);


              uniqueFoodsMap.set(food.barcode, {
                id: food.barcode,
                name: food.name,
                amount: `${amount}g`,
                calories: calcCalories,
                carbs: calcCarbs,
                protein: calcProtein,
                fat: calcFats
              });
            }
          });
        }

        // Convert Map back to array and take the top 10
        setRecentFoods(Array.from(uniqueFoodsMap.values()).slice(0, 10));

      } catch (error) {
        console.error('Error fetching recent foods:', error);
      } finally {
        setIsLoadingRecent(false);
      }
    }

    fetchRecentFoods();
  }, []);

  const handleAddItem = (item: FoodItem) => {
    addStagedItem({
      id: item.id,
      name: item.name,
      amount: parseFloat(item.amount) || 100,
      unit: 'g',
      calories: item.calories,
      carbs: item.carbs,
      protein: item.protein,
      fat: item.fat
    });
  };

  const handleDone = async () => {
    if (addedItems.length === 0) return;
    setIsSaving(true);

    try {
      // 1. Get the current authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('User not logged in');

      // Helper to cast the meal string to the specific union type required by Supabase
      const dbMealType = displayMeal.toLowerCase() as 'breakfast' | 'lunch' | 'dinner' | 'snacks';

      // 2. Map through all staged items and save them
      for (const item of addedItems) {
        
        let localFoodId = null;

        // Step A: Check if this food already exists in our DB by barcode (id from API)
        const { data: existingFood, error: checkError } = await supabase
          .from('foods')
          .select('id')
          .eq('barcode', item.id)
          .maybeSingle();

        if (checkError) {
          console.error("Check Error:", checkError);
          throw checkError;
        }

        if (existingFood) {
          localFoodId = existingFood.id;
        } else {
          // Step B: If it doesn't exist, insert it into our DB
          const { data: newFood, error: foodError } = await supabase
            .from('foods')
            .insert({
              barcode: item.id,
              name: item.name,
              calories_per_100g: item.calories,
              protein_per_100g: item.protein, 
              carbs_per_100g: item.carbs,
              fat_per_100g: item.fat,
              is_custom: false,
              created_by: user.id
            })
            .select('id')
            .single();

          if (foodError) throw foodError;
          localFoodId = newFood.id;
        }

        // Step C: Insert the actual tracking entry for today
        const { error: trackingError } = await supabase
          .from('tracking_entries')
          .insert({
            user_id: user.id,
            meal_type: dbMealType,
            food_id: localFoodId,
            amount_in_grams: item.amount, // TODO: Convert unit to grams if it's 'serving'
            consumed_date: new Date().toISOString().split('T')[0] // 'YYYY-MM-DD'
          });

        if (trackingError) throw trackingError;
      }

      // 3. Clear the cart and go back to dashboard
      clearStagedItems();
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/dashboard');
      }

    } catch (error) {
      console.error('Error saving entries:', error);
      Alert.alert('Error', 'Could not save your entries. Please try again.');
    } finally {
      setIsSaving(false);
    }
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

  const handleBarcodeScanned = async ({ type, data }: { type: string, data: string }) => {
    setIsScanning(false);
    
    setSearchQuery(data);
    setIsFetchingFood(true);

    const product = await fetchProductByBarcode(data);
    
    setIsFetchingFood(false);

    if (product) {
    const newFoodItem = {
      id: product.id,
      name: product.name,
      amount: '100g',
      calories: product.calories_per_100g,
      carbs: product.carbs_per_100g,
      protein: product.protein_per_100g,
      fat: product.fat_per_100g
    };
    
    addStagedItem({
      id: product.id,
      name: product.name,
      amount: 100,
      unit: 'g',
      calories: product.calories_per_100g,
      carbs: product.carbs_per_100g,
      protein: product.protein_per_100g,
      fat: product.fat_per_100g
    });
    
    Alert.alert(
      'Product Found!', 
      `${product.brand} - ${product.name}\n${product.calories_per_100g} kcal per 100g`
    );
    } else {
      Alert.alert(
        'Not Found', 
        'We could not find this product in the Open Food Facts database. You can add it manually.'
      );
    }
  };

  // Handler for Quick Add from search results
  const handleQuickAdd = (food: FetchedFood) => {
    addStagedItem({
      id: food.id,
      name: food.name,
      amount: parseFloat(food.serving_size || '100'), 
      unit: food.serving_size?.includes('ml') ? 'ml' : 'g',
      calories: Math.round(food.calories_per_100g),
      carbs: Math.round(food.carbs_per_100g),
      protein: Math.round(food.protein_per_100g),
      fat: Math.round(food.fat_per_100g),
    });
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
      
      {/* HEADER */}
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
          className="p-2 -mr-2 w-16 items-end"
          disabled={addedItems.length === 0 || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#22c55e" />
          ) : (
            <Text className={`text-lg font-bold ${addedItems.length > 0 ? 'text-green-500' : 'text-gray-300 dark:text-gray-600'}`}>
              Done
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* SEARCH BAR & SCANNER */}
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

      {/* CONDITIONAL RENDERING: Show Search Results OR Default Tabs */}
      {searchQuery.length >= 3 ? (
        <ScrollView className="flex-1 px-4 pt-2">
          <Text className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">
            Search Results
          </Text>

          {searchResults.map((item) => (
            <View 
              key={item.id} 
              className="flex-row items-center justify-between mb-4 bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-50 dark:border-gray-700"
            >
              <TouchableOpacity className="flex-1 pr-4" 
                  onPress={() => router.push({ 
                  pathname: '/food-detail', 
                  params: { barcode: item.id, meal: displayMeal } 
                })}
              >
                <Text className="text-base font-bold text-gray-800 dark:text-white mb-1" numberOfLines={1}>
                  {item.name}
                </Text>
                <Text className="text-sm text-gray-500 dark:text-gray-400 mb-1" numberOfLines={1}>
                  {item.brand}
                </Text>
                <Text className="text-sm text-gray-500 dark:text-gray-400">
                  {item.serving_size || '100g'} • <Text className="text-green-600 dark:text-green-400 font-medium">{Math.round(item.calories_per_100g)} kcal</Text>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                className="w-10 h-10 bg-green-50 dark:bg-gray-700 rounded-full items-center justify-center"
                onPress={() => handleQuickAdd(item)}
              >
                <Ionicons name="add" size={24} color="#22c55e" />
              </TouchableOpacity>
            </View>
          ))}
          
          {!isSearching && searchResults.length === 0 && (
            <Text className="text-center text-gray-500 mt-10">No products found.</Text>
          )}
          <View className="h-10" />
        </ScrollView>
      ) : (
        <View className="flex-1">
          {/* TABS HEADER */}
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

          {/* TAB CONTENT */}
          <ScrollView className="flex-1 px-4 pt-4">
            
            {activeTab === 'recipes' && (
              <TouchableOpacity className="flex-row items-center justify-center bg-green-50 dark:bg-gray-800 border border-green-200 dark:border-green-900 rounded-xl py-4 mb-6">
                <Ionicons name="add-circle" size={24} color="#22c55e" className="mr-2" />
                <Text className="text-green-600 dark:text-green-400 font-bold text-base ml-2">
                  Create New Recipe
                </Text>
              </TouchableOpacity>
            )}

            <Text className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">
              {activeTab === 'foods' ? 'Recently Added' : 'Your Recipes'}
            </Text>

            {/* List logic: Spinner -> List -> Empty Message */}
            {activeTab === 'foods' && isLoadingRecent ? (
              <ActivityIndicator size="small" color="#22c55e" className="mt-4" />
            ) : (
              (activeTab === 'foods' ? recentFoods : userRecipes).map((item) => (
                <View 
                  key={item.id} 
                  className="flex-row items-center justify-between mb-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-50 dark:border-gray-700"
                >
                  <TouchableOpacity 
                    className="flex-1 pr-4" 
                    onPress={() => router.push({ 
                      pathname: '/food-detail', 
                      params: { barcode: item.id, meal: displayMeal } 
                    })}
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

                  <TouchableOpacity 
                    className="w-10 h-10 bg-green-50 dark:bg-gray-700 rounded-full items-center justify-center"
                    onPress={() => handleAddItem(item)}
                  >
                    <Ionicons name="add" size={24} color="#22c55e" />
                  </TouchableOpacity>
                </View>
              ))
            )}
            
            {activeTab === 'foods' && !isLoadingRecent && recentFoods.length === 0 && (
              <Text className="text-center text-gray-500 dark:text-gray-400 mt-4">
                No recent foods found. Use search to add items!
              </Text>
            )}
            
            <View className="h-10" />
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}
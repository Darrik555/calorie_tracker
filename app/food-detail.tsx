import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ScrollView, 
  Image, ActivityIndicator, Modal 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchProductByBarcode, FetchedFood } from '../src/services/openFoodFacts';
import { useEntryStore } from '../src/store/useEntryStore';

export default function FoodDetailScreen() {
  const { barcode, meal: initialMeal } = useLocalSearchParams<{ barcode: string, meal: string }>();
  
  // Access our global staging area
  const addStagedItem = useEntryStore(state => state.addStagedItem);

  // State for the food data
  const [food, setFood] = useState<FetchedFood | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);

  // State for Meal Dropdown
  const meals = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];
  const [selectedMeal, setSelectedMeal] = useState(initialMeal || 'Breakfast');
  const [showMealModal, setShowMealModal] = useState(false);

  // State for Bottom Input (Amount & Unit)
  const [amount, setAmount] = useState('100');
  const [selectedUnit, setSelectedUnit] = useState('g');
  const [showUnitModal, setShowUnitModal] = useState(false);

  // Dynamic available units based on the API data
  const [availableUnits, setAvailableUnits] = useState<string[]>(['g']);

  // Fetch full details when screen mounts
  useEffect(() => {
    async function loadFood() {
      if (barcode) {
        const data = await fetchProductByBarcode(barcode);
        setFood(data);
    
        // determine what units make sense
        if (data) {
          const defaultBaseUnit = data.is_liquid ? 'ml' : 'g';
          let units = [defaultBaseUnit];
          
          if (data.serving_quantity_g) {
            units.push('serving');
          }
          
          setAvailableUnits(units);
          setSelectedUnit(defaultBaseUnit);
        }
      }
      setIsLoading(false);
    }
    loadFood();
  }, [barcode]);

  // Handle unit change 
  const handleUnitChange = (newUnit: string) => {
    setSelectedUnit(newUnit);
    setShowUnitModal(false);

    if (newUnit === 'serving' || newUnit === 'piece') {
      setAmount('1');
    } else {
      setAmount('100'); 
    }
  };

  // Calculate the multiplier based on selected unit and amount
  let multiplier = 0;
  const parsedAmount = parseFloat(amount) || 0;

  if (food) {
    if (selectedUnit === 'g' || selectedUnit === 'ml') {
      multiplier = parsedAmount / 100;
    } else if (selectedUnit === 'serving' && food.serving_quantity_g) {
      multiplier = (food.serving_quantity_g * parsedAmount) / 100;
    }
  }

  // Helper to calculate and format values safely
  const calc = (valuePer100g: number | undefined) => {
    if (valuePer100g === undefined) return 0;
    return Math.round(valuePer100g * multiplier);
  };

  const handleAddEntry = () => {
    if (!food) return;

    addStagedItem({
      id: Math.random().toString(),
      name: food.name,
      amount: parsedAmount,
      unit: selectedUnit,
      calories: calc(food.calories_per_100g),
      carbs: calc(food.carbs_per_100g),
      protein: calc(food.protein_per_100g),
      fat: calc(food.fat_per_100g)
    });
    router.back();
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-gray-900">
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  if (!food) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-gray-900">
        <Text className="text-gray-500">Food details not found.</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 p-3 bg-green-500 rounded-xl">
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      <Stack.Screen options={{ headerShown: false }} />

      {/* HEADER */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <Ionicons name="arrow-back" size={28} color="#6b7280" />
        </TouchableOpacity>
        
        {/* Simulated Dropdown for Meal Selection */}
        <TouchableOpacity 
          className="flex-row items-center bg-gray-100 dark:bg-gray-800 px-4 py-1.5 rounded-full"
          onPress={() => setShowMealModal(true)}
        >
          <Text className="text-base font-bold text-gray-800 dark:text-white mr-1">
            {selectedMeal}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#6b7280" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsFavorite(!isFavorite)} className="p-2 -mr-2">
          <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={28} color={isFavorite ? "#ef4444" : "#6b7280"} />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* BANNER: Image, Name, Brand */}
        <View className="items-center px-6 py-6 border-b border-gray-100 dark:border-gray-800">
          {food.image_url ? (
            <Image 
              source={{ uri: food.image_url }} 
              className="w-32 h-32 rounded-2xl mb-4 bg-gray-100"
              resizeMode="contain"
            />
          ) : (
            <View className="w-32 h-32 rounded-2xl mb-4 bg-gray-100 dark:bg-gray-800 items-center justify-center">
              <Ionicons name="restaurant-outline" size={40} color="#9ca3af" />
            </View>
          )}
          <Text className="text-2xl font-extrabold text-center text-gray-800 dark:text-white mb-1">
            {food.name}
          </Text>
          <Text className="text-base font-medium text-gray-500 dark:text-gray-400">
            {food.brand || 'Generic Brand'}
          </Text>
        </View>

        {/* MACROS ROW */}
        <View className="flex-row justify-between px-6 py-6 border-b border-gray-100 dark:border-gray-800">
          <View className="items-center">
            <Text className="text-2xl font-bold text-gray-800 dark:text-white">{calc(food.calories_per_100g)}</Text>
            <Text className="text-xs text-gray-500 font-medium uppercase mt-1">kcal</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-blue-500">{calc(food.carbs_per_100g)}g</Text>
            <Text className="text-xs text-gray-500 font-medium uppercase mt-1">Carbs</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-red-500">{calc(food.protein_per_100g)}g</Text>
            <Text className="text-xs text-gray-500 font-medium uppercase mt-1">Protein</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-yellow-500">{calc(food.fat_per_100g)}g</Text>
            <Text className="text-xs text-gray-500 font-medium uppercase mt-1">Fat</Text>
          </View>
        </View>

        {/* NUTRITION FACTS LIST */}
        <View className="px-6 py-6">
          <Text className="text-lg font-bold text-gray-800 dark:text-white mb-4">
            Nutrition Facts
          </Text>
          
          <View className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
            {[
              { label: 'Saturated Fat', value: calc(food.saturated_fat_per_100g) },
              { label: 'Sugars', value: calc(food.sugars_per_100g) },
              { label: 'Fiber', value: calc(food.fiber_per_100g) },
              { label: 'Salt', value: calc(food.salt_per_100g) },
            ].map((item, index) => (
              <View 
                key={item.label} 
                className={`flex-row justify-between py-3 ${index !== 3 ? 'border-b border-gray-200 dark:border-gray-700' : ''}`}
              >
                <Text className="text-base text-gray-600 dark:text-gray-300">{item.label}</Text>
                <Text className="text-base font-semibold text-gray-800 dark:text-white">{item.value}g</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* FIXED BOTTOM BAR */}
      <View className="absolute bottom-0 w-full bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-4 py-4 pb-8 flex-row items-center justify-between shadow-lg">
        
        {/* Input & Unit Group */}
        <View className="flex-row items-center flex-1 mr-4 bg-gray-100 dark:bg-gray-800 rounded-2xl h-14">
          <TextInput
            className="flex-1 text-center text-xl font-bold text-gray-800 dark:text-white h-full"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            selectTextOnFocus
          />
          
          <View className="w-[1px] h-8 bg-gray-300 dark:bg-gray-600" />
          
          <TouchableOpacity 
            className="flex-1 h-full justify-center flex-row items-center"
            onPress={() => setShowUnitModal(true)}
          >
            <Text className="text-base font-semibold text-gray-600 dark:text-gray-300 mr-1 capitalize">
              {selectedUnit}
            </Text>
            <Ionicons name="caret-down" size={12} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Add Button */}
        <TouchableOpacity 
          className="bg-green-500 h-14 px-8 rounded-2xl items-center justify-center flex-row"
          onPress={handleAddEntry}
        >
          <Ionicons name="checkmark" size={24} color="white" className="mr-2" />
          <Text className="text-white text-lg font-bold ml-1">Add</Text>
        </TouchableOpacity>
      </View>

      {/* MODALS for Dropdowns (Meal & Unit) */}
      
      {/* Meal Selection Modal */}
      <Modal visible={showMealModal} transparent animationType="fade">
        <TouchableOpacity className="flex-1 bg-black/50 justify-center items-center" activeOpacity={1} onPress={() => setShowMealModal(false)}>
          <View className="bg-white dark:bg-gray-800 w-3/4 rounded-3xl overflow-hidden">
            {meals.map((mealItem) => (
              <TouchableOpacity 
                key={mealItem} 
                className="p-5 border-b border-gray-100 dark:border-gray-700 items-center"
                onPress={() => { setSelectedMeal(mealItem); setShowMealModal(false); }}
              >
                <Text className="text-lg font-semibold text-gray-800 dark:text-white">{mealItem}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Unit Selection Modal */}
      <Modal visible={showUnitModal} transparent animationType="fade">
        <TouchableOpacity className="flex-1 bg-black/50 justify-end" activeOpacity={1} onPress={() => setShowUnitModal(false)}>
          <View className="bg-white dark:bg-gray-800 rounded-t-3xl pb-10 pt-4">
            <View className="w-12 h-1.5 bg-gray-300 rounded-full self-center mb-6" />
            {availableUnits.map((unitItem) => (
              <TouchableOpacity 
                key={unitItem} 
                className="p-4 items-center"
                onPress={() => handleUnitChange(unitItem)}
              >
                <Text className={`text-xl capitalize ${selectedUnit === unitItem ? 'font-bold text-green-500' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
                  {unitItem}
                  {/* Show descriptive text for servings */}
                  {unitItem === 'serving' && food?.serving_size ? ` (${food.serving_size})` : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}
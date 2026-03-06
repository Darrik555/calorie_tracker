import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ScrollView, 
  Alert, ActivityIndicator, Modal 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../src/services/supabase';
import { useRecipeStore } from '../src/store/useRecipeStore';
import { searchProductsByText, FetchedFood } from '../src/services/openFoodFacts';

export default function CreateRecipeScreen() {
  // Global Draft State
  const { title, ingredients, setTitle, addIngredient, removeIngredient, clearRecipe } = useRecipeStore();
  
  // Local UI States
  const [isSaving, setIsSaving] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  
  // Search Modal States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FetchedFood[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Derived calculations: Total macros of the recipe
  const totalKcal = ingredients.reduce((sum, ing) => sum + ing.calories, 0);
  const totalCarbs = ingredients.reduce((sum, ing) => sum + ing.carbs, 0);
  const totalProtein = ingredients.reduce((sum, ing) => sum + ing.protein, 0);
  const totalFat = ingredients.reduce((sum, ing) => sum + ing.fat, 0);

  // Debounced Search inside the modal
  useEffect(() => {
    if (searchQuery.length < 3) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const delay = setTimeout(async () => {
      const results = await searchProductsByText(searchQuery);
      setSearchResults(results);
      setIsSearching(false);
    }, 500);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  // Handler to add a searched food as an ingredient
  const handleAddIngredient = (food: FetchedFood) => {
    // For MVP, we add 100g standard. You could open a quantity modal here later!
    addIngredient({
      barcode: food.id,
      name: food.name,
      amount_in_grams: 100,
      calories: Math.round(food.calories_per_100g),
      protein: Math.round(food.protein_per_100g),
      carbs: Math.round(food.carbs_per_100g),
      fat: Math.round(food.fat_per_100g),
    });
    // Reset and close search
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchModal(false);
  };

  // The massive Save function linking multiple tables
  const handleSaveRecipe = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please give your recipe a name.');
      return;
    }
    if (ingredients.length === 0) {
      Alert.alert('Empty Recipe', 'Please add at least one ingredient.');
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      // 1. Create the Recipe record
      const { data: newRecipe, error: recipeErr } = await supabase
        .from('recipes')
        .insert({
          user_id: user.id,
          title: title,
        })
        .select('id')
        .single();

      if (recipeErr) throw recipeErr;

      // 2. Loop through ingredients, ensure food exists, and link them
      for (const ing of ingredients) {
        let localFoodId = null;

        // A. Check if food exists in our DB
        const { data: existingFood } = await supabase
          .from('foods')
          .select('id')
          .eq('barcode', ing.barcode)
          .single();

        if (existingFood) {
          localFoodId = existingFood.id;
        } else {
          // B. Insert food into DB if missing
          const { data: newFood, error: foodErr } = await supabase
            .from('foods')
            .insert({
              barcode: ing.barcode,
              name: ing.name,
              calories_per_100g: ing.calories, // Based on 100g mapped above
              protein_per_100g: ing.protein,
              carbs_per_100g: ing.carbs,
              fat_per_100g: ing.fat,
              is_custom: false
            })
            .select('id')
            .single();

          if (foodErr) throw foodErr;
          localFoodId = newFood.id;
        }

        // C. Link food to recipe in recipe_ingredients table
        const { error: linkErr } = await supabase
          .from('recipe_ingredients')
          .insert({
            recipe_id: newRecipe.id,
            food_id: localFoodId,
            amount_in_grams: ing.amount_in_grams,
          });

        if (linkErr) throw linkErr;
      }

      // Success! Clear draft and go back
      clearRecipe();
      router.back();

    } catch (error: any) {
      console.error('Save Recipe Error:', error);
      Alert.alert('Error', error.message || 'Could not save recipe.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      <Stack.Screen options={{ headerShown: false }} />

      {/* 1. HEADER */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <Ionicons name="close" size={28} color="#6b7280" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-800 dark:text-white">New Recipe</Text>
        <TouchableOpacity onPress={handleSaveRecipe} disabled={isSaving} className="p-2 -mr-2 w-16 items-end">
          {isSaving ? (
            <ActivityIndicator size="small" color="#22c55e" />
          ) : (
            <Text className="text-lg font-bold text-green-500">Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4 pt-4">
        {/* 2. RECIPE TITLE */}
        <TextInput
          className="text-3xl font-bold text-gray-800 dark:text-white mb-6"
          placeholder="Recipe Name..."
          placeholderTextColor="#9ca3af"
          value={title}
          onChangeText={setTitle}
        />

        {/* 3. MACRO SUMMARY */}
        <View className="flex-row justify-between bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl mb-6">
          <View className="items-center">
            <Text className="text-xl font-bold text-gray-800 dark:text-white">{Math.round(totalKcal)}</Text>
            <Text className="text-xs text-gray-500">kcal</Text>
          </View>
          <View className="items-center">
            <Text className="text-xl font-bold text-blue-500">{Math.round(totalCarbs)}g</Text>
            <Text className="text-xs text-gray-500">Carbs</Text>
          </View>
          <View className="items-center">
            <Text className="text-xl font-bold text-red-500">{Math.round(totalProtein)}g</Text>
            <Text className="text-xs text-gray-500">Protein</Text>
          </View>
          <View className="items-center">
            <Text className="text-xl font-bold text-yellow-500">{Math.round(totalFat)}g</Text>
            <Text className="text-xs text-gray-500">Fat</Text>
          </View>
        </View>

        {/* 4. INGREDIENTS LIST */}
        <View className="flex-row justify-between items-end mb-4">
          <Text className="text-lg font-bold text-gray-800 dark:text-white">Ingredients</Text>
          <Text className="text-sm text-gray-500">{ingredients.length} items</Text>
        </View>

        {ingredients.map((ing) => (
          <View key={ing.barcode} className="flex-row items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 mb-3">
            <View className="flex-1">
              <Text className="text-base font-bold text-gray-800 dark:text-white">{ing.name}</Text>
              <Text className="text-sm text-gray-500">{ing.amount_in_grams}g • {ing.calories} kcal</Text>
            </View>
            <TouchableOpacity onPress={() => removeIngredient(ing.barcode)} className="p-2">
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        ))}

        {/* 5. ADD INGREDIENT BUTTON */}
        <TouchableOpacity 
          className="flex-row items-center justify-center bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl py-4 mt-2 mb-10"
          onPress={() => setShowSearchModal(true)}
        >
          <Ionicons name="add" size={24} color="#22c55e" />
          <Text className="text-green-600 dark:text-green-400 font-bold text-base ml-2">Add Ingredient</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 6. SEARCH MODAL FOR INGREDIENTS */}
      <Modal visible={showSearchModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <Text className="text-lg font-bold text-gray-800 dark:text-white">Search Ingredient</Text>
            <TouchableOpacity onPress={() => setShowSearchModal(false)}>
              <Text className="text-blue-500 font-bold text-base">Close</Text>
            </TouchableOpacity>
          </View>
          
          <View className="p-4">
            <View className="flex-row items-center bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 mb-4">
              <Ionicons name="search" size={20} color="#9ca3af" />
              <TextInput
                className="flex-1 ml-2 text-base text-gray-800 dark:text-white"
                placeholder="Search..."
                placeholderTextColor="#9ca3af"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {isSearching && <ActivityIndicator size="small" color="#22c55e" />}
            </View>

            <ScrollView>
              {searchResults.map((item) => (
                <TouchableOpacity 
                  key={item.id} 
                  className="flex-row items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800"
                  onPress={() => handleAddIngredient(item)}
                >
                  <View className="flex-1">
                    <Text className="font-bold text-gray-800 dark:text-white">{item.name}</Text>
                    <Text className="text-sm text-gray-500">{item.brand || 'Generic'} • {Math.round(item.calories_per_100g)} kcal/100g</Text>
                  </View>
                  <Ionicons name="add-circle" size={24} color="#22c55e" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}
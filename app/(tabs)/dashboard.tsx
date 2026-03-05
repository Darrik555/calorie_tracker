import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/services/supabase';

  interface DailyStats {
    kcal: number;
    carbs: number;
    protein: number;
    fat: number;
  }
  interface MealTotals {
    breakfast: number;
    lunch: number;
    dinner: number;
    snacks: number;
  }

export default function DashboardScreen() {
const [isLoading, setIsLoading] = useState(true);

  // Targets (Usually fetched from the 'profiles' table, we use logical defaults for now)
  const [targets, setTargets] = useState<DailyStats>({ 
    kcal: 2000, carbs: 250, protein: 150, fat: 70 
  });
  
  // Actually consumed macros/kcal
  const [consumed, setConsumed] = useState<DailyStats>({ 
    kcal: 0, carbs: 0, protein: 0, fat: 0 
  });

  // Calories per meal
  const [mealTotals, setMealTotals] = useState<MealTotals>({
    breakfast: 0, lunch: 0, dinner: 0, snacks: 0
  });

  const burnedKcal = 0; // We keep this static until we implement Apple Health / Google Fit sync

  useFocusEffect(
    useCallback(() => {
      fetchTodayData();
    }, [])
  );

  const fetchTodayData = async () => {
    setIsLoading(true);
    try {
      // 1. Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Optional: Fetch user's actual goals from 'profiles' table here later
      
      // 2. Fetch today's tracking entries AND join the 'foods' data to get the macros
      const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
      
      const { data: entries, error } = await supabase
        .from('tracking_entries')
        .select(`
          meal_type,
          amount_in_grams,
          foods (
            calories_per_100g,
            protein_per_100g,
            carbs_per_100g,
            fat_per_100g
          )
        `)
        .eq('user_id', user.id)
        .eq('consumed_date', today);

      if (error) throw error;

      // 3. Aggregate the data
      let sumKcal = 0, sumCarbs = 0, sumProtein = 0, sumFat = 0;
      let mTotals = { breakfast: 0, lunch: 0, dinner: 0, snacks: 0 };

      if (entries) {
        entries.forEach(entry => {
          if (entry.foods) {
            // Calculate multiplier based on grams eaten
            const multiplier = entry.amount_in_grams / 100;
            
            // Note: If you have an array returned due to type definitions, you might need to use entry.foods[0], 
            // but since it's a one-to-many relationship, it should be a single object.
            const food = Array.isArray(entry.foods) ? entry.foods[0] : entry.foods;

            const entryKcal = (food.calories_per_100g || 0) * multiplier;
            
            sumKcal += entryKcal;
            sumCarbs += (food.carbs_per_100g || 0) * multiplier;
            sumProtein += (food.protein_per_100g || 0) * multiplier;
            sumFat += (food.fat_per_100g || 0) * multiplier;

            // Add to specific meal bucket
            const mealKey = entry.meal_type as keyof MealTotals;
            if (mealKey in mTotals) {
              mTotals[mealKey] += entryKcal;
            }
          }
        });
      }

      // 4. Update state with rounded numbers
      setConsumed({
        kcal: Math.round(sumKcal),
        carbs: Math.round(sumCarbs),
        protein: Math.round(sumProtein),
        fat: Math.round(sumFat)
      });
      setMealTotals({
        breakfast: Math.round(mTotals.breakfast),
        lunch: Math.round(mTotals.lunch),
        dinner: Math.round(mTotals.dinner),
        snacks: Math.round(mTotals.snacks),
      });

    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculations for UI
  const remainingKcal = targets.kcal - consumed.kcal + burnedKcal;

  const macros = {
    carbs: { current: consumed.carbs, target: targets.carbs, color: 'bg-blue-400' },
    protein: { current: consumed.protein, target: targets.protein, color: 'bg-red-400' },
    fat: { current: consumed.fat, target: targets.fat, color: 'bg-yellow-400' },
  };

  const mealsList = [
    { id: '1', name: 'Breakfast', kcal: mealTotals.breakfast },
    { id: '2', name: 'Lunch', kcal: mealTotals.lunch },
    { id: '3', name: 'Dinner', kcal: mealTotals.dinner },
    { id: '4', name: 'Snacks', kcal: mealTotals.snacks },
  ];

  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900 justify-center items-center">
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900 px-4 pt-12">
      {/* Header */}
      <Text className="text-3xl font-bold text-gray-800 dark:tex-white mb-6 tracking-tight">
        Today
      </Text>

      {/* Top Box: Calorie Summary & Macros */}
      <View className="bg-white dark:bg-gray-800 rounded-3xl p-6 mb-6 shadow-sm border border-gray-100 dark:border-gray-700">
        
        {/* Tacho / Calorie Counter Row */}
        <View className="flex-row justify-between items-center mb-8">
          
          {/* Left: Eaten */}
          <View className="items-center flex-1">
            <Text className="text-gray-500 dark:text-gray-400 font-medium mb-1">Eaten</Text>
            <Text className="text-xl font-bold text-gray-800 dark:text-white">{consumed.kcal}</Text>
            <Text className="text-xs text-gray-400">kcal</Text>
          </View>

          {/* Center: Tacho (Remaining) */}
          <View className="items-center justify-center w-32 h-32 rounded-full border-8 border-green-100 dark:border-green-900/30 bg-white dark:bg-gray-800 shadow-sm z-10">
            {/* Color changes to red if over limit */}
            <Text className={`text-3xl font-extrabold ${remainingKcal < 0 ? 'text-red-500' : 'text-green-500'}`}>
              {Math.abs(remainingKcal)}
            </Text>
            <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {remainingKcal < 0 ? 'Over' : 'Remaining'}
            </Text>
          </View>

          {/* Right: Burned (Placeholder) */}
          <View className="items-center flex-1">
            <Text className="text-gray-500 dark:text-gray-400 font-medium mb-1">Burned</Text>
            <Text className="text-xl font-bold text-orange-400">{burnedKcal}</Text>
            <Text className="text-xs text-gray-400">kcal</Text>
          </View>
        </View>

        {/* Macros Section */}
        <View className="flex-row justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
          {Object.entries(macros).map(([key, macro]) => {
            // Calculate percentage for the progress bar, maxed at 100%
            const progress = Math.min((macro.current / macro.target) * 100, 100);

            return (
              <View key={key} className="flex-1 px-2">
                <View className="flex-row justify-between mb-2">
                  <Text className="text-xs font-bold text-gray-700 dark:text-gray-300 capitalize">{key}</Text>
                  <Text className="text-xs text-gray-500 dark:text-gray-400">{macro.current}g</Text>
                </View>
                {/* Progress Bar Background */}
                <View className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  {/* Progress Bar Fill */}
                  <View 
                    className={`h-full rounded-full ${macro.color}`} 
                    style={{ width: `${progress}%` }} 
                  />
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Bottom Box: Nutrition / Meals */}
      <Text className="text-xl font-bold text-gray-800 dark:text-white mb-4 px-2">
        Nutrition
      </Text>
      
      <View className="bg-white dark:bg-gray-800 rounded-3xl p-4 mb-12 shadow-sm border border-gray-100 dark:border-gray-700">
        {mealsList.map((meal, index) => (
          <View 
            key={meal.id} 
            className={`flex-row items-center justify-between py-4 ${
              index !== mealsList.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''
            }`}
          >
            <View className="flex-1">
              <Text className="text-base font-bold text-gray-800 dark:text-white">{meal.name}</Text>
              <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">{meal.kcal} kcal</Text>
            </View>

            <TouchableOpacity 
              className="bg-green-100 dark:bg-green-900/30 w-10 h-10 rounded-full items-center justify-center" 
              onPress={() => router.push({ pathname: '/add-entry', params: { meal: meal.name } })}
            >
              <Ionicons name="add" size={24} color="#22c55e" />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
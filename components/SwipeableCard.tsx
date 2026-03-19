import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, Alert, Dimensions, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.4;

interface SwipeableCardProps {
  children: React.ReactNode;
  onDelete: () => void;
  onDuplicate: () => void;
  deleteLabel?: string;
  duplicateLabel?: string;
  confirmDelete?: boolean;
  style?: ViewStyle;
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  onDelete,
  onDuplicate,
  deleteLabel = 'Elimina',
  duplicateLabel = 'Duplica',
  confirmDelete = true,
  style,
}) => {
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const hapticTriggered = useSharedValue(false);

  const confirmDeleteAction = useCallback(() => {
    if (confirmDelete) {
      Alert.alert(
        'Conferma Eliminazione',
        'Sei sicuro di voler eliminare questo elemento?',
        [
          {
            text: 'Annulla',
            style: 'cancel',
            onPress: () => {
              translateX.value = withSpring(0);
            },
          },
          {
            text: 'Elimina',
            style: 'destructive',
            onPress: () => {
              translateX.value = withTiming(-SCREEN_WIDTH, { duration: 300 }, () => {
                runOnJS(onDelete)();
              });
            },
          },
        ]
      );
    } else {
      translateX.value = withTiming(-SCREEN_WIDTH, { duration: 300 }, () => {
        runOnJS(onDelete)();
      });
    }
  }, [confirmDelete, onDelete, translateX]);

  const handleDuplicate = useCallback(() => {
    runOnJS(onDuplicate)();
    translateX.value = withSpring(0);
  }, [onDuplicate, translateX]);

  const showContextMenu = useCallback(() => {
    Alert.alert(
      'Azioni Rapide',
      'Scegli un\'azione per questo elemento',
      [
        {
          text: 'Duplica',
          onPress: () => runOnJS(handleDuplicate)(),
        },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: () => runOnJS(confirmDeleteAction)(),
        },
        {
          text: 'Annulla',
          style: 'cancel',
        },
      ]
    );
  }, [handleDuplicate, confirmDeleteAction]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;

      // Haptic feedback logic
      if (Math.abs(event.translationX) >= SWIPE_THRESHOLD && !hapticTriggered.value) {
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
        hapticTriggered.value = true;
      } else if (Math.abs(event.translationX) < SWIPE_THRESHOLD && hapticTriggered.value) {
        hapticTriggered.value = false;
      }
    })
    .onEnd((event) => {
      if (event.translationX < -SWIPE_THRESHOLD) {
        // Swipe Left -> Delete
        runOnJS(confirmDeleteAction)();
      } else if (event.translationX > SWIPE_THRESHOLD) {
        // Swipe Right -> Duplicate
        runOnJS(handleDuplicate)();
      } else {
        // Return to center
        translateX.value = withSpring(0);
      }
      hapticTriggered.value = false;
    });

  const longPressGesture = Gesture.LongPress()
    .onStart(() => {
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
      runOnJS(showContextMenu)();
    });

  const gesture = Gesture.Race(panGesture, longPressGesture);

  const rCardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const rLeftActionStyle = useAnimatedStyle(() => {
    const opacityVal = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP
    );
    return {
      opacity: opacityVal,
      transform: [
        {
          scale: interpolate(
            translateX.value,
            [0, SWIPE_THRESHOLD],
            [0.5, 1.2],
            Extrapolation.CLAMP
          ),
        },
      ],
    };
  });

  const rRightActionStyle = useAnimatedStyle(() => {
    const opacityVal = interpolate(
      translateX.value,
      [0, -SWIPE_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP
    );
    return {
      opacity: opacityVal,
      transform: [
        {
          scale: interpolate(
            translateX.value,
            [0, -SWIPE_THRESHOLD],
            [0.5, 1.2],
            Extrapolation.CLAMP
          ),
        },
      ],
    };
  });

  const rBackgroundStyle = useAnimatedStyle(() => {
    const backgroundColor = translateX.value > 0 ? '#10B981' : '#EF4444'; // Green for duplicate, Red for delete
    const opacityVal = interpolate(
      Math.abs(translateX.value),
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP
    );
    return {
      backgroundColor,
      opacity: opacityVal,
    };
  });

  return (
    <View style={[styles.container, style]}>
      <Animated.View 
        style={[styles.background, rBackgroundStyle]}
        accessibilityElementsHidden={true}
        importantForAccessibility="no-hide-descendants"
      >
        <Animated.View style={[styles.action, styles.duplicateAction, rLeftActionStyle]}>
          <Ionicons name="copy-outline" size={24} color="#FFF" />
          <Text style={styles.actionText}>{duplicateLabel}</Text>
        </Animated.View>
        <Animated.View style={[styles.action, styles.deleteAction, rRightActionStyle]}>
          <Text style={styles.actionText}>{deleteLabel}</Text>
          <Ionicons name="trash-outline" size={24} color="#FFF" />
        </Animated.View>
      </Animated.View>

      <GestureDetector gesture={gesture}>
        <Animated.View 
          style={[styles.card, rCardStyle]}
          accessible={true}
          accessibilityLabel="Card trascinabile"
          accessibilityHint={`Trascina a destra per ${duplicateLabel.toLowerCase()} o a sinistra per ${deleteLabel.toLowerCase()}. Tieni premuto per il menu azioni.`}
        >
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    borderRadius: 16,
    overflow: 'hidden',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  duplicateAction: {
    // Left side
  },
  deleteAction: {
    // Right side
  },
  actionText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
  },
});

export default SwipeableCard;

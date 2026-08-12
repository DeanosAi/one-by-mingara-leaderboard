<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class One_Leaderboard_Workouts {
	public static function all() {
		return array(
			array(
				'id'            => 'run-1km',
				'name'          => '1KM Run',
				'eyebrow'       => 'Speed challenge',
				'description'   => 'Run one kilometre on the track or treadmill. Your fastest verified time takes the lead.',
				'active'        => true,
				'rankingMetric' => 'time_asc',
				'resultFields'  => array(
					array( 'id' => 'timeCentiseconds', 'label' => 'Completion time', 'type' => 'time', 'unit' => 'min:sec.00', 'required' => true ),
				),
				'display'       => array( 'icon' => 'timer', 'accent' => '#6db9cf', 'shortCode' => '01', 'statLabel' => 'Fastest time' ),
				'validation'    => array( 'minTimeCentiseconds' => 3000, 'maxTimeCentiseconds' => 359999 ),
			),
			array(
				'id'            => 'war-balls-100',
				'name'          => '100 War Balls',
				'eyebrow'       => 'Strength endurance',
				'description'   => 'Complete 100 war ball repetitions for time. Ball weight is recorded, while ranking is based on speed only.',
				'active'        => true,
				'rankingMetric' => 'time_asc',
				'resultFields'  => array(
					array( 'id' => 'timeCentiseconds', 'label' => 'Completion time', 'type' => 'time', 'unit' => 'min:sec.00', 'required' => true ),
					array( 'id' => 'ballWeightKg', 'label' => 'Ball weight', 'type' => 'select', 'unit' => 'kg', 'options' => array( 4, 6, 8, 9, 10, 12 ), 'required' => true ),
				),
				'display'       => array( 'icon' => 'target', 'accent' => '#8fcebb', 'shortCode' => '02', 'statLabel' => 'Fastest time' ),
				'validation'    => array( 'minTimeCentiseconds' => 3000, 'maxTimeCentiseconds' => 359999 ),
			),
			array(
				'id'            => 'row-1km',
				'name'          => '1KM Row',
				'eyebrow'       => 'Power endurance',
				'description'   => 'Row one kilometre on the erg. Your fastest verified completion time takes the lead.',
				'active'        => true,
				'rankingMetric' => 'time_asc',
				'resultFields'  => array(
					array( 'id' => 'timeCentiseconds', 'label' => 'Completion time', 'type' => 'time', 'unit' => 'min:sec.00', 'required' => true ),
				),
				'display'       => array( 'icon' => 'gauge', 'accent' => '#75bfd0', 'shortCode' => '03', 'statLabel' => 'Fastest time' ),
				'validation'    => array( 'minTimeCentiseconds' => 3000, 'maxTimeCentiseconds' => 359999 ),
			),
			array(
				'id'            => 'ski-1km',
				'name'          => '1KM Ski',
				'eyebrow'       => 'Full-body endurance',
				'description'   => 'Complete one kilometre on the SkiErg. The fastest verified completion time ranks first.',
				'active'        => true,
				'rankingMetric' => 'time_asc',
				'resultFields'  => array(
					array( 'id' => 'timeCentiseconds', 'label' => 'Completion time', 'type' => 'time', 'unit' => 'min:sec.00', 'required' => true ),
				),
				'display'       => array( 'icon' => 'sparkles', 'accent' => '#a4d8ca', 'shortCode' => '04', 'statLabel' => 'Fastest time' ),
				'validation'    => array( 'minTimeCentiseconds' => 3000, 'maxTimeCentiseconds' => 359999 ),
			),
			array(
				'id'            => 'burpee-broad-jumps-80m',
				'name'          => '80m Burpee Broad Jumps',
				'eyebrow'       => 'Conditioning challenge',
				'description'   => 'Complete 80 metres of burpee broad jumps for time. The fastest verified completion time takes the lead.',
				'active'        => true,
				'rankingMetric' => 'time_asc',
				'resultFields'  => array(
					array( 'id' => 'timeCentiseconds', 'label' => 'Completion time', 'type' => 'time', 'unit' => 'min:sec.00', 'required' => true ),
				),
				'display'       => array( 'icon' => 'dumbbell', 'accent' => '#87b6d1', 'shortCode' => '05', 'statLabel' => 'Fastest time' ),
				'validation'    => array( 'minTimeCentiseconds' => 3000, 'maxTimeCentiseconds' => 359999 ),
			),
		);
	}

	public static function find( $workout_id ) {
		foreach ( self::all() as $workout ) {
			if ( $workout['id'] === $workout_id ) {
				return $workout;
			}
		}
		return null;
	}
}


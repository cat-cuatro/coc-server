/*
  Gets a committee record and all associated records and returns as structured JSON
*/

SELECT json_build_object(
  'name', c.name
  ,'Id', c.committee_id
  ,'description', c.description
  ,'totalSlots',c.total_slots
  ,'committeeSlots',(
		SELECT json_agg(
			json_build_object(
				'senateShortname', cs.senate_division_short_name
				,'slotRequiements', cs.slot_requirements
                /*,'totalSlotsFilled',(
					SELECT json_agg(
						json_build_object(
						'senateDivision', senate_division
						,'slotFilled', sd_slot_filled
						,'slot minimun'
						,CASE
						WHEN slot_stats.sd_slot_minimum IS NULL THEN '-'
						ELSE CAST(slot_stats.sd_slot_minimum AS VARCHAR)
						END		 
						)
					)FROM  slot_stats 
					WHERE committee_id = c.committee_id
				    )*/
			)
		) FROM committee_slots cs
		WHERE c.committee_id = cs.committee_id
	)
  ,'committeeAssignment',(
		SELECT json_agg(
			json_build_object(
				'facultyName', f.full_name
				,'facultyEmail', f.email
				,'startDate', ca.start_date
				,'endDate', ca.end_date
				,'senateDivsion', f.senate_division_short_name
			)
		) FROM committee_assignment ca NATURAL JOIN faculty f
		WHERE f.email = ca.email AND ca.committee_id = c.committee_id
	)
   ,'totalSlotsFilled',(
	   SELECT json_agg(
			json_build_object(
				'senateDivision', senate_division
				,'slotFilled', sd_slot_filled
				,'slotMinimun'
				,CASE
				WHEN slot_stats.sd_slot_minimum IS NULL THEN '-'
				ELSE CAST(slot_stats.sd_slot_minimum AS VARCHAR)
				END
			)
		)FROM slot_stats
		WHERE committee_id = c.committee_id
	)

)FROM committee c WHERE c.committee_id = $1
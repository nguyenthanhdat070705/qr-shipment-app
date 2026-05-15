-- Migration to fix silent failure of bulk upserts for getfly_contracts

CREATE OR REPLACE FUNCTION public.bulk_upsert_getfly_contracts(payload jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    row_count integer := 0;
    contract_row jsonb;
BEGIN
    FOR contract_row IN SELECT * FROM jsonb_array_elements(payload)
    LOOP
        INSERT INTO public.getfly_contracts (
            getfly_contract_id,
            contract_name,
            contract_code,
            source_contract_code,
            contract_status,
            contract_status_code,
            contract_type,
            remaining_days,
            created_date,
            effective_date,
            expiry_date,
            customer_name,
            customer_phone,
            person_in_charge,
            contract_value,
            actual_value,
            executed_amount,
            paid_amount,
            debt_amount,
            beneficiary_name_1,
            beneficiary_vneid_1,
            beneficiary_phone_1,
            beneficiary_address_1,
            beneficiary_name_2,
            beneficiary_vneid_2,
            beneficiary_phone_2,
            beneficiary_address_2,
            buyer_email,
            synced_at,
            raw_data
        ) VALUES (
            contract_row->>'getfly_contract_id',
            contract_row->>'contract_name',
            contract_row->>'contract_code',
            contract_row->>'source_contract_code',
            contract_row->>'contract_status',
            contract_row->>'contract_status_code',
            contract_row->>'contract_type',
            (contract_row->>'remaining_days')::integer,
            contract_row->>'created_date',
            contract_row->>'effective_date',
            contract_row->>'expiry_date',
            contract_row->>'customer_name',
            contract_row->>'customer_phone',
            contract_row->>'person_in_charge',
            (contract_row->>'contract_value')::numeric,
            (contract_row->>'actual_value')::numeric,
            (contract_row->>'executed_amount')::numeric,
            (contract_row->>'paid_amount')::numeric,
            (contract_row->>'debt_amount')::numeric,
            contract_row->>'beneficiary_name_1',
            contract_row->>'beneficiary_vneid_1',
            contract_row->>'beneficiary_phone_1',
            contract_row->>'beneficiary_address_1',
            contract_row->>'beneficiary_name_2',
            contract_row->>'beneficiary_vneid_2',
            contract_row->>'beneficiary_phone_2',
            contract_row->>'beneficiary_address_2',
            contract_row->>'buyer_email',
            (contract_row->>'synced_at')::timestamp with time zone,
            contract_row->'raw_data'
        )
        ON CONFLICT (getfly_contract_id) DO UPDATE SET
            contract_name = EXCLUDED.contract_name,
            contract_code = EXCLUDED.contract_code,
            source_contract_code = EXCLUDED.source_contract_code,
            contract_status = EXCLUDED.contract_status,
            contract_status_code = EXCLUDED.contract_status_code,
            contract_type = EXCLUDED.contract_type,
            remaining_days = EXCLUDED.remaining_days,
            created_date = EXCLUDED.created_date,
            effective_date = EXCLUDED.effective_date,
            expiry_date = EXCLUDED.expiry_date,
            customer_name = EXCLUDED.customer_name,
            customer_phone = EXCLUDED.customer_phone,
            person_in_charge = EXCLUDED.person_in_charge,
            contract_value = EXCLUDED.contract_value,
            actual_value = EXCLUDED.actual_value,
            executed_amount = EXCLUDED.executed_amount,
            paid_amount = EXCLUDED.paid_amount,
            debt_amount = EXCLUDED.debt_amount,
            beneficiary_name_1 = EXCLUDED.beneficiary_name_1,
            beneficiary_vneid_1 = EXCLUDED.beneficiary_vneid_1,
            beneficiary_phone_1 = EXCLUDED.beneficiary_phone_1,
            beneficiary_address_1 = EXCLUDED.beneficiary_address_1,
            beneficiary_name_2 = EXCLUDED.beneficiary_name_2,
            beneficiary_vneid_2 = EXCLUDED.beneficiary_vneid_2,
            beneficiary_phone_2 = EXCLUDED.beneficiary_phone_2,
            beneficiary_address_2 = EXCLUDED.beneficiary_address_2,
            buyer_email = EXCLUDED.buyer_email,
            synced_at = EXCLUDED.synced_at,
            raw_data = EXCLUDED.raw_data;
            
        row_count := row_count + 1;
    END LOOP;
    
    -- Notify PostgREST to reload schema cache
    NOTIFY pgrst, 'reload schema';
    
    RETURN row_count;
END;
$$;

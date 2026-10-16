import test from 'node:test';
import assert from 'node:assert/strict';
import { groups, readable, editPayload, validateDraft, clothingFields, emergencyFields } from '../lib/profile/model.ts';
import { validHrResponse } from '../lib/hr/response.ts';
import { hrRequest } from '../lib/hr/api.ts';
test('only self-service fields are included in profile edits',()=>{
 const editable=groups.filter(g=>g.editable).flatMap(g=>g.fields);
 const payload=editPayload(editable,{first_name:' Alex ',pay_rate:'99999',user_id:'other',bank_account_number:'123'});
 assert.equal(payload.first_name,'Alex');assert.equal('pay_rate' in payload,false);assert.equal('user_id' in payload,false);assert.equal('bank_account_number' in payload,false);
 assert.equal(payload.middle_name,null);
});
test('validates calendar dates and email before saving',()=>{
 const f=groups.filter(g=>g.editable).flatMap(g=>g.fields);
 assert.match(validateDraft(f,{date_of_birth:'2025-02-30'}),/valid date/);
 assert.match(validateDraft(f,{personal_email:'not email'}),/valid email/);
 assert.match(validateDraft(f,{date_of_birth:'2999-01-01'}),/future/);
 assert.equal(validateDraft(f,{date_of_birth:'1990-02-28',personal_email:'alex@example.com'}),null);
});
test('profile response envelopes reject missing data',()=>{
 assert.equal(validHrResponse('/profile','GET',{employee:null}),false);
 assert.equal(validHrResponse('/profile','GET',{employee:{id:'a',user_id:'b'}}),true);
 assert.equal(validHrResponse('/profile/clothing','GET',{sizes:null}),false);
 assert.equal(validHrResponse('/profile/documents','GET',{documents:[],requirements:[]}),true);
 assert.equal(validHrResponse('/profile/training','GET',{records:[]}),false);
});
test('profile transport preserves PATCH, bearer identity and structured validation errors',async()=>{
 let captured;
 await hrRequest('https://example.com','test-token','/profile',{method:'PATCH',body:{first_name:'Alex'},fetcher:async(url,init)=>{captured={url,init};return Response.json({employee:{id:'a'}});}});
 assert.equal(captured.url,'https://example.com/api/mobile/employee/profile');assert.equal(captured.init.method,'PATCH');assert.equal(captured.init.headers.Authorization,'Bearer test-token');assert.equal(captured.init.credentials,'omit');
 await assert.rejects(hrRequest('https://example.com','test-token','/profile',{method:'PATCH',fetcher:async()=>Response.json({error:{message:'Not allowed'}},{status:403})}),/Not allowed/);
});
test('clothing and emergency edit fields match existing self-service fields',()=>{assert.equal(clothingFields.length,8);assert.ok(clothingFields.every(f=>f.options.includes('not_required')));assert.ok(emergencyFields.some(f=>f.key==='home_phone'));assert.ok(!emergencyFields.some(f=>f.key==='employee_id'));});

test('display preserves email and identifier underscores',()=>{assert.equal(readable('alex_smith@example.com'),'alex_smith@example.com');assert.equal(readable('REF_123'),'REF_123');});

test('date-only formatting preserves calendar dates and rejects invalid dates', async()=>{
 const {parseProfileDate,profileDateValue,formatProfileDate}=await import('../lib/profile/dates.ts');
 for(const value of ['1990-03-14','2024-02-29','2000-01-01']) assert.equal(profileDateValue(parseProfileDate(value)),value);
 assert.equal(parseProfileDate('2025-02-29'),null);
 assert.equal(parseProfileDate('2026-13-01'),null);
 assert.equal(formatProfileDate('1990-03-14'),'14 March 1990');
 assert.equal(formatProfileDate(''),'Not provided');
});

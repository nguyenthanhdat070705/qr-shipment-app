Danh sách các API của Tài khoản người dùng
GET /api/admin/user/gets
Danh sách tài khoản người dùng.
GET /api/admin/user/item
Chi tiết tài khoản người dùng.
POST /api/admin/user/insert
Tạo mới tài khoản người dùng.
POST /api/admin/user/update
Cập nhật tài khoản người dùng.
POST /api/admin/user/delete
Xóa tài khoản người dùng.
GET/api/admin/user/gets
Danh sách tài khoản người dùng
Field	Type	Required	Description
access_token*	string	true	Mã bảo mật
hl	string	false	Ngôn ngữ sử dụng
Thuộc 1 trong các giá trị sau: 'vn', 'en'. Mặc định là: 'vn'
field_raws	string	false	Danh sách trường dữ liệu nhận dữ liệu raw
Các trường cách nhau bởi dấu ",". Sử dụng "allfield" nếu muốn tất cả các trường đều nhận dữ liệu raw. Ví dụ: field_1,field_2,products, products.title, products.price...
limit	integer	false	Số bản ghi trên trang (mặc định 50, tối đa 100)
page	integer	false	Số trang (mặc định 1)
sort_by	string	false	Tên trường cần sắp xếp
sort_type	string	false	Thứ tự sắp xếp của tên trường cần sắp xếp, giá trị là 'asc' hoặc 'desc'. trong đó 'asc' là sắp xếp tăng dần. 'desc' là sắp xếp giảm dần
filters	json	false	Giá trị cần lọc
Json encode của mảng dữ liệu. Ví dụ:
[{"key1":"value1", "key2":"value2"}, {"key1":"value1", "key2":"value2"}, ...]
Cấu trúc của field filters
s	string	false	Tìm kiếm từ khóa
group_id	string	false	Nhóm
Thuộc 1 trong các giá trị sau:(Sử dụng cột Giá trị, nếu cấu hình field_raws hãy sử dụng cột ID)
ID	Giá trị	ID	Giá trị
123	'(Liberico) Ban Giám đốc'	125	'(Liberico) Nhân viên'
124	'(Liberico) Nhóm trưởng phòng'	95	'[Agribank] Nhóm quyền Giám đốc'
97	'[Agribank] Nhóm quyền Nhân viên'	96	'[Agribank] Nhóm quyền Trưởng phòng'
116	'[GTV] Nhóm nhân viên xây dựng'	129	'[HTN] Giám đốc'
140	'[Lê Lai] NV'	139	'[Lê Lai] TP'
145	'[Nhân viên]'	113	'[RC8] Ban lãnh đạo'
115	'[RC8] Nhân viên'	114	'[RC8] Quản lý'
119	'[TN] Admin'	146	'A'
149	'abc'	57	'ADMIN'
35	'Ban Giám đốc'	101	'Ban Giám đốc Thiên Dương'
103	'BLĐ _ABC'	134	'CƯỜNG TUẤN PHÁT'
89	'ĐIỀU HÀNH - TLR'	64	'Full quyền admin'
104	'GĐ thiết kế/thi công -ABC'	121	'GEC admin'
122	'GEC nhân viên'	88	'HDQT - TLR'
138	'HOÀNG VĂN MƯỜI HAI'	75	'IP - GIÁM ĐỐC'
77	'IP - NHÂN VIÊN KINH DOANH'	76	'IP - TRUONG PHONG KINH DOANH 1'
127	'KD5- Enterprise'	132	'KD5- Work'
85	'KẾ TOÁN NYNHI'	84	'KẾ TOÁN TRƯỞNG NYNHI'
120	'KEYENCE'	92	'KHỐI HÀNH CHÍNH_NHÂN SỰ - TLR'
90	'KHỐI KINH DOANH - TLR'	91	'KHỐI TÀI CHÍNH - TLR'
117	'MAC_Admin'	118	'MAC_Nhân viên'
128	'Mây'	86	'MELMEL ACADEMY'
144	'Nhân sự luantn'	47	'Nhân viên - c1'
51	'Nhân viên 2022'	37	'Nhân viên HCNS'
40	'Nhân viên kế toán -ABC'	36	'Nhân viên Kinh doanh'
41	'Nhân viên thiết kế'	105	'Nhân viên thiết kế/thi công -ABC'
107	'Nhân viên tư vấn -ABC'	72	'Nhân viên UCA'
151	'Nhóm AAAAAAA'	21	'Nhóm admin'
126	'Nhóm admin - CDP'	87	'Nhóm admin - TLR'
150	'Nhóm best'	133	'Nhóm Bluezone'
93	'NHÓM CHỈ DÙNG TUYỂN DỤNG'	44	'Nhóm Chuyên viên kinh doanh cao cấp'
45	'Nhóm CRM + Công việc '	152	'Nhóm FULL quyền'
52	'Nhóm full quyền quản lý'	71	'Nhóm Lãnh đạo UCA'
61	'nhóm linh tester'	143	'NHÓM MUA BÁN'
131	'Nhóm quản trị'	142	'Nhóm quản trị hệ thống'
56	'Nhóm test'	59	'Nhóm test farmer'
147	'Nhóm test quyền lịch họp'	53	'Nhóm test thanh toán trả sau'
49	'nhóm test1'	63	'Nhóm trả sau 1'
43	'Nhóm trưởng phòng'	74	'Nhóm Trưởng phòng kinh doanh'
48	'NHÓM VĂN PHÒNG'	73	'Nhóm Vinacontrol'
60	'nhóm xài hết combo'	136	'NV - ĐẠI XƯƠNG THẠNH'
81	'NV HCSN NYNHI'	110	'NV HCSN-ABC'
111	'NV marketing -ABC'	78	'NV Song huyền'
83	'NVKD NYNHI'	79	'NYNHI BAN GIÁM ĐỐC'
38	'Phòng Khảo Sát'	137	'Phúc Đỉnh'
135	'QL - ĐẠI XƯƠNG THẠNH'	130	'Quản lý'
46	'Tài khoản Viettel Post'	94	'TD nhóm Nippovina'
148	'Test lịch biểu'	54	'Test nhóm người dùng TT sau 1'
55	'Test thanh toán trả sau 2'	112	'TP marketing -ABC'
108	'TP tài chính - kế toán - ABC'	106	'TP tư vấn - ABC'
39	'Trưởng phòng HCNS'	80	'TRƯỞNG PHÒNG HCNS NYNHI'
109	'Trưởng phòng HCNS-ABC'	82	'TRƯỞNG PHÒNG KD NYNHI'
42	'Trưởng phòng kinh doanh'	100	'VNPT Chi nhánh'
99	'VNPT Trụ sở chính'	98	'WPL'
inherit_roles	string	false	Tùy chỉnh quyền
Thuộc 1 trong các giá trị sau:(Sử dụng cột Giá trị, nếu cấu hình field_raws hãy sử dụng cột ID)
ID	Giá trị
yes	'Không'	Mặc định
no	'Có'	
is_admin	string	false	Quản trị hệ thống
Thuộc 1 trong các giá trị sau:(Sử dụng cột Giá trị, nếu cấu hình field_raws hãy sử dụng cột ID)
ID	Giá trị
yes	'admin.user.enum.is_admin.yes'	
no	'admin.user.enum.is_admin.no'	Mặc định
status	string	false	Trạng thái
Thuộc 1 trong các giá trị sau:(Sử dụng cột Giá trị, nếu cấu hình field_raws hãy sử dụng cột ID)
ID	Giá trị
ACTIVE	'Đang hoạt động'	Mặc định
BLOCK	'Bị khóa'	
department_id	string	false	Phòng ban
Phòng ban cha con được nối với nhau bởi dấu ||. Ví dụ 'Phòng kinh doanh || Nhóm 1' hoặc 'Cửa hàng A || Phòng điều hành || Ban giám đốc',....
job_title	string	false	Chức vụ
Thuộc 1 trong các giá trị sau:(Sử dụng cột Giá trị, nếu cấu hình field_raws hãy sử dụng cột ID)
ID	Giá trị	ID	Giá trị
496	'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaab'	486	'alo bạn ơi'
475	'Ban giám đốc'	464	'CEO'
476	'CFO'	498	'Chức vụ 123'
490	'chuyên viên'	495	'Chuyên viên cao cấp'
477	'COO'	462	'CTO (luantn 2)'
461	'Giám đốc (luantn)'	489	'Giám đốc 1 (luantn)'
469	'giám đốc tài chính'	482	'giàu'
473	'Head'	480	'lao công'
484	'Mai'	474	'Manager'
481	'Nguyệt'	487	'Nhân viên'
488	'Nhân viên'	468	'Nhân viên Ban Cố Vấn'
457	'Nhân viên văn phòng'	485	'Ô hô hô'
467	'phó ban'	478	'Phó giám đốc'
458	'Phó phòng'	479	'Phó tổng giám đốc'
460	'PM-Project-Manager'	459	'Quản lý'
497	'Senior BA ★★★ #1'	470	'tài chính'
492	'Test log'	465	'Tổng giám đốc'
483	'trẻ'	466	'trưởng ban'
471	'Trưởng bộ phận'	472	'Trưởng nhóm'
494	'Trưởng phòng'
position_id	string	false	Vị trí
Thuộc 1 trong các giá trị sau:(Sử dụng cột Giá trị, nếu cấu hình field_raws hãy sử dụng cột ID)
ID	Giá trị	ID	Giá trị
340	'(1) Chuyên viên ban đấu thầu'	591	'(2) Chuyên viên ban đấu giá'
560	'[ Mây ] Trưởng phòng thiết kế'	628	'[GTV] Cố vấn cấp cao về công nghệ'
629	'[GTV] Cố vấn về phát triển thị trường'	614	'[GTV] Giám đốc chi nhánh'
640	'[GTV] Giám đốc F&B'	637	'[GTV] Nhân viên bếp chế biến'
623	'[GTV] Nhân viên chăm sóc khách hàng'	627	'[GTV] Nhân viên giám sát'
618	'[GTV] Nhân viên kế toán'	613	'[GTV] Nhân viên kinh doanh'
636	'[GTV] Nhân viên lễ tân'	617	'[GTV] Nhân viên nhân sự'
620	'[GTV] Nhân viên phân tích tài chính'	639	'[GTV] Nhân viên phụ bếp'
638	'[GTV] Nhân viên quầy trà sữa'	635	'[GTV] Nhân viên sảnh sau'
634	'[GTV] Nhân viên sảnh trước'	622	'[GTV] Nhân viên triển khai'
621	'[GTV] Nhân viên tuyển dụng'	632	'[GTV] Quản lý khối Nhà hàng'
633	'[GTV] Quản lý Nhà hàng'	626	'[GTV] Trưởng nhóm CSKH'
625	'[GTV] Trưởng nhóm triển khai'	631	'[GTV] Trưởng phòng CSKH'
615	'[GTV] Trưởng phòng kinh doanh'	616	'[GTV] Trưởng phòng nhân sự'
624	'[GTV] Trưởng phòng Triển khai - CSKH'	561	'[Mây] Nhân viên thiết kế'
648	'822228888888'	647	'88888888'
646	'aaaaNhân viên kho1'	581	'Account'
537	'Account Manager'	299	'Admin'
334	'Admin'	222	'Admission Counselor'
691	'AI Engineer'	689	'AI researcher'
692	'AI Reseracher'	375	'Bàn'
460	'BAN GIÁM ĐỐC'	465	'BAN GIÁM ĐỐC'
664	'Ban Giám Đốc Chi Nhánh Vũng Tàu'	155	'Bán hàng'
373	'Bảo vệ'	378	'Bếp Bánh 베이커리'
383	'Bếp BBQ 바비큐 주방'	377	'Bếp Hàn 한식'
385	'Bếp Shabu 샤브샤브'	382	'Bếp Trung 중식'
384	'Bếp Việt 베식'	376	'Boy'
286	'Brand Accountant'	228	'CEN'
361	'CEO'	268	'CFO'
421	'Chỉ huy trưởng'	641	'Chính thức'
599	'Chủ đầu tư'	165	'Chủ tịch HĐQT'
441	'Chủ tịch HĐTV'	399	'Chủ tịch Thành phố'
400	'Chủ tịch UBND Phường'	411	'Chủ trì thiết kế'
202	'Chuyên viên'	660	'Chuyên viên 12'
264	'Chuyên viên C&B'	682	'Chuyên viên cao cấp phòng Đầu tư'
683	'Chuyên viên cao cấp phòng Pháp chế'	486	'Chuyên Viên Dự Toán (QS)'
218	'Chuyên viên ERP'	488	'Chuyên viên giám sát công trường'
479	'Chuyên viên Hành chính Nhân sự'	555	'Chuyên viên Hỗ trợ bán hàng'
557	'Chuyên viên IT'	681	'Chuyên viên kế toán - Quản trị quỹ'
671	'CHUYÊN VIÊN KIỂM THỬ (LUANTN)'	310	'Chuyên viên Kinh doanh'
338	'Chuyên viên kỹ thuật'	234	'Chuyên viên mua hàng'
336	'Chuyên viên nhân sự'	483	'Chuyên viên Pháp lý'
550	'Chuyên viên phụ trách truyền thông'	337	'Chuyên viên tài chính'
335	'Chuyên viên thị trường'	489	'Chuyên viên TK 3D'
476	'Chuyên viên TK Nội thất'	680	'Chuyên viên truyền thông - Marketing'
425	'Chuyên viên tư vấn'	405	'Chuyên viên tuyển dụng'
145	'Cố vấn Ban giám đốc'	147	'Cố vấn cao cấp phát triển sản phẩm'
148	'Cố vấn cấp cao về công nghệ'	270	'COC'
111	'Cộng tác viên'	459	'CÔNG TY TNHH PHÁT TRIỂN GIÁO DỊCH 1OFFICE'
436	'Content'	432	'Content PR'
434	'Content Promotion'	362	'COO'
269	'COP'	533	'Customer Service'
246	'CV HCNS'	395	'Data Analyst'
394	'Dây chuyền'	644	'ddd'
226	'Department Head'	438	'designer'
289	'Dev'	658	'Developer'
423	'Dự toán vật tư'	430	'Đào tạo nội bộ & Truyền thông'
391	'Điều phối'	315	'Đóng gói'
437	'Editor'	433	'Editor video'
225	'Education Advisor'	300	'Employee'
284	'FA Manager'	549	'GĐKD Khu vực Tây Bắc Bộ'
541	'GEC Giám đốc'	540	'GEC Nhân viên'
342	'Giám định viên'	346	'Giám định viên bậc 2'
345	'Giám định viên chính'	351	'Giám định viên Hàng hải'
350	'Giám định viên Máy móc thiết bị'	349	'Giám định viên Nông sản, Thuỷ sản, Thực phẩm, Thức ăn chăn nuôi'
331	'Giám đốc'	192	'Giám Đốc'
207	'Giám Đốc Chi Nhánh'	150	'Giám đốc chi nhánh Hà Nội'
556	'Giám đốc IP Coms'	179	'GIÁM ĐỐC KHỐI'
544	'Giám đốc Khối Tài chính'	543	'Giám đốc Khối Thương mại'
542	'Giám đốc Khối Vận hành'	124	'Giám đốc kinh doanh'
126	'Giám đốc kỹ thuật'	431	'Giám đốc MKT'
125	'Giám đốc nhân sự'	250	'Giám đốc NM'
551	'Giám đốc Phát triển kênh Siêu thị'	123	'Giám đốc tài chính'
420	'Giám đốc Thi công'	409	'Giám đốc Thiết kế'
127	'Giám đốc thương hiệu'	193	'Giám Đốc Truyền Thông'
343	'Giám đốc VINACONTROL Hà Nội'	603	'Giám đốc xưởng'
368	'Giám sát'	330	'Giám sát dự án'
422	'Giám sát thi công'	630	'Giảng viên'
454	'Giáo viên - Địa lý'	452	'Giáo viên Hóa'
456	'Giáo viên Lịch sử'	446	'Giáo viên Ngữ văn'
230	'Giáo viên NN'	458	'Giáo viên Sinh học'
448	'Giáo viên Toán'	450	'Giáo viên Vật lý'
229	'Giáo viên VN'	283	'Graphic Designer And Video Editor'
585	'Growth Lead'	304	'Hành chính'
134	'Hành chính nhân sự'	464	'HN'
227	'HO-HCM'	645	'Hr Senior'
152	'IT'	325	'Junior'
149	'Kế toán'	480	'Kế toán mua hàng'
429	'Kế toán nội bộ'	428	'Ké toán quỹ'
481	'Kế toán thanh toán'	427	'Kế toán tổng hợp'
205	'Kế toán trưởng'	320	'Kế toán trưởng Phòng TC-KT'
314	'Kế toán viên'	287	'Key Account Management'
466	'KHỐI ĐÀO TẠO'	461	'KHỐI VĂN PHÒNG'
358	'Kiểm kho'	332	'Kiểm soát'
413	'Kiểm soát chất lượng'	136	'Kiểm thử'
393	'Kiểm tra chất lượng'	440	'Kiến trúc sư'
414	'Kiến trúc sư 3D'	132	'Kinh doanh'
416	'Kỹ thuật 2D'	379	'Lái xe 기사'
339	'Lãnh đạo ban đấu thầu'	381	'Lau ly 기물실'
380	'Lễ tân 영업부(인포)'	653	'Luantn'
656	'Luantn test'	685	'Mai test 1'
301	'Manager'	311	'manager'
135	'Marketing'	190	'Marketing Diva'
191	'Marketing Diva Group'	536	'Marketing Support'
655	'mua'	600	'Nhà thầu chính'
157	'Nhân viên'	469	'Nhân viên Ban Cố Vấn'
235	'Nhân viên bán hàng'	470	'Nhân viên Ban Pháp chế'
389	'Nhân viên CH'	663	'Nhân Viên Chi Nhánh'
398	'Nhân viên chia bài'	593	'Nhân viên Chuyển đổi số và Công nghệ thông tin'
519	'Nhân viên CSKH'	572	'Nhân viên CSM'
178	'Nhân viên dự án'	579	'Nhân viên dự toán'
406	'Nhân viên fulltime'	360	'Nhân viên hành chính - nhân sự'
565	'Nhân viên Hành chính quản trị'	388	'Nhân viên HC'
213	'Nhân viên HCNS'	212	'Nhân Viên HSE'
267	'Nhân viên IT'	257	'Nhân viên Kế toán'
278	'Nhân viên kho'	168	'Nhân viên kinh doanh'
566	'Nhân viên Kinh doanh 1'	569	'Nhân viên Kinh doanh 2'
251	'Nhân viên KTDA'	232	'Nhân viên Kỹ thuật'
604	'Nhân viên lắp ráp'	265	'Nhân viên Lễ Tân - Hành chính'
236	'Nhân viên marketing'	247	'Nhân viên MKT'
238	'Nhân viên mua hàng'	249	'Nhân viên NCPT'
564	'Nhân viên Nhân sự_Kế toán'	612	'NHÂN VIÊN NMT'
407	'Nhân viên parttime'	675	'Nhân viên pháp chế'
472	'Nhân viên Phòng HCNS'	317	'Nhân viên phòng Kế hoạch chiến lược 1'
319	'Nhân viên phòng Kế hoạch chiến lược 2'	473	'Nhân viên Phòng Kế Toán'
322	'Nhân viên Phòng kinh doanh'	323	'Nhân viên Phòng mua hàng'
321	'Nhân viên Phòng TC-KT'	650	'Nhân viên phụ'
252	'Nhân viên QA'	271	'Nhân viên QC'
298	'Nhân viên QTTH'	667	'Nhân Viên Quản Lý Rủi Ro'
274	'Nhân viên sản xuất'	397	'Nhân viên Sảnh'
595	'Nhân viên Tài chính kế toán'	276	'Nhân viên TCKT'
573	'Nhân viên thi công'	577	'Nhân viên thiết kế'
396	'Nhân viên thu ngân'	597	'Nhân viên Tổ chức Nhân sự và Đào tạo'
253	'Nhân viên Trade'	266	'Nhân viên Tuyển dung & Đào tạo'
598	'Nhân viên Văn phòng'	248	'Nhân viên xây dựng chiến lược'
443	'NV HC-NS'	444	'NV Mua hàng'
324	'NV Phụ kho'	221	'P. Trưởng trung tâm'
643	'Parttime'	672	'Phân tích nghiệp vụ'
153	'Phát triển dự án'	137	'Phát triển phần mềm'
160	'Phát triển sản phẩm'	245	'Phó Ban HCNS'
545	'Phó GĐ Vận hành'	195	'Phó Giám đốc'
475	'Phó Giám Đốc Kinh doanh'	474	'Phó Giám Đốc Sản xuất'
666	'Phó Giám Đốc Tài Chính'	547	'Phó Giám đốc Vận hành'
344	'Phó Giám đốc VINACONTROL Hà Nội'	203	'Phó phòng'
217	'Phó phòng ERP'	348	'Phó phòng giám định 2'
352	'Phó phòng giám định viên Hàng hải'	354	'Phó phòng Giám định viên Máy móc thiết bị'
263	'Phó phòng HCNS'	548	'Phó phòng O&M'
574	'Phó phòng thi công'	143	'Phó phòng vật tư'
166	'Phó TGĐ TC - KTT'	139	'Phó tổng giám đốc'
442	'Phó tổng gián đôc'	347	'Phó Trưởng phòng giám định 2'
353	'Phó Trưởng phòng Giám định viên Nông sản, Thuỷ sản, Thực phẩm, Thức ăn chăn nuôi'	216	'Phó Trưởng Phòng Ứng Dụng Nền Tảng'
462	'PHÒNG HCNS'	463	'PHÒNG KẾ TOÁN'
370	'Phụ bếp'	580	'Phụ trách TC-HC'
386	'Phục vụ 영업부(홀)'	584	'Planning Lead'
223	'Project Head'	285	'Project Manager'
313	'QLSX'	275	'Quản đốc sản xuất'
144	'Quản lý'	410	'Quản lý Dự án'
258	'Quản lý HCNS'	256	'Quản lý KTDA'
260	'Quản lý NCPT'	255	'Quản lý QA'
254	'Quản lý Trade'	259	'Quản lý xây dựng chiến lược'
435	'Quay chụp'	312	'sale'
365	'Sale Manager'	366	'Sale Staff'
333	'Sale và xử lý hồ sơ'	534	'Sales'
538	'Sales Admin'	224	'Sales Supervisor'
305	'Sản xuất'	583	'SEO Executive'
582	'SEO Manager'	302	'Sub Manager'
326	'Supervisor'	290	'Supply '
282	'Supply Chain Executive'	372	'Tạp vụ'
356	'Tất cả'	670	'TĐV QLRR'
539	'Teamleader KTT'	364	'Technical Experts'
363	'Technical Manager'	535	'Technical Support'
677	'Tesst log 23 sửa'	654	'Test lụa'
652	'Test phát'	288	'Tester'
686	'tester senior'	676	'Tết log'
412	'Thiết kế 3D'	279	'Thủ kho'
359	'Thư Ký'	554	'Thư ký BoM'
485	'Thư ký Dự án'	327	'Thử việc'
642	'Thực tập sinh'	371	'Tổ phó bếp'
468	'TỔ SINH HỌC'	467	'TỔ TOÁN'
453	'Tổ Trưởng - Tổ Địa lý'	451	'Tổ Trưởng - Tổ Hóa'
455	'Tổ Trưởng - Tổ Lịch sử'	445	'Tổ Trưởng - Tổ Ngữ văn'
457	'Tổ Trưởng - Tổ Sinh học'	447	'Tổ Trưởng - Tổ toán'
449	'Tổ Trưởng - Tổ Vật lý'	374	'Tổ trưởng bàn'
369	'Tổ trưởng Bếp'	138	'Tổng Giám đốc'
219	'Tổng giám đốc'	303	'Tổng hợp'
133	'Triển khai'	606	'Trinh _ CVKD'
605	'Trinh _ TPKD'	602	'Trình dược viên'
610	'TRINHPHAM - Tổng Giám đốc'	609	'TRINHPHAM - TRƯỞNG PHÒNG HCNS'
367	'Trợ lý quản lý'	426	'Trực live Partime'
329	'Trực tổng đài'	661	'trưởng'
415	'Trưởng kỹ thuật'	592	'Trưởng ban Chuyển đổi số và Công nghệ thông tin'
487	'Trưởng ban điều hành công trường'	594	'Trưởng ban Tài chính kế toán'
596	'Trưởng ban Tổ chức Nhân sự và Đào tạo'	387	'Trưởng bộ phận'
308	'Trưởng Bộ phận Đàm phán giá'	674	'Trưởng bộ phận Nhân viên IT'
307	'Trưởng Bộ phận Quản lý tài sản & Chi phí'	408	'Trưởng cửa hàng'
665	'Trưởng Đơn Vị Quản Lý Rủi Ro'	568	'Trưởng khoa Kinh doanh 2'
417	'Trưởng nhóm 3D'	237	'Trưởng nhóm bán hàng'
571	'Trưởng nhóm CSM'	214	'Trưởng nhóm ERP'
159	'Trưởng nhóm kĩ thuật'	570	'Trưởng nhóm Kinh doanh 2'
291	'Trưởng nhóm nghiệp vụ'	669	'Trưởng nhóm Sale Admin'
576	'Trưởng nhóm thiết kế'	419	'Trưởng nhóm triển khai'
404	'Trưởng nhóm tuyển dụng'	418	'Trưởng phòng'
281	'Trưởng phòng bán hàng'	209	'Trưởng Phòng Công Nghệ Và An Toàn'
578	'Trưởng phòng dự toán'	169	'Trưởng phòng Đào tạo'
177	'Trưởng phòng đào tạo'	679	'Trưởng phòng Đầu tư'
546	'Trưởng phòng Điều phối Kho vận'	478	'Trưởng Phòng Hành chính Nhân sự'
563	'Trưởng phòng Hành chính quản trị'	210	'Trưởng Phòng Hậu Cần & Vận Hành'
262	'Trưởng phòng HCNS'	309	'Trưởng phòng HCNS'
194	'Trưởng phòng IT'	316	'Trưởng phòng Kế hoạch chiến lược 1'
318	'Trưởng phòng Kế hoạch chiến lược 2'	328	'TRƯỞNG PHÒNG KINH DOANH'
174	'Trưởng phòng kinh doanh'	208	'Trưởng Phòng Kinh Doanh & Tiếp Thị'
567	'Trưởng phòng Kinh doanh 1'	484	'Trưởng Phòng KTSX'
231	'Trưởng phòng Kỹ thuật'	280	'Trưởng phòng mua hàng'
176	'Trưởng phòng nhân sự'	562	'Trưởng phòng Nhân sự_Kế toán'
611	'TRƯỞNG PHÒNG NMT'	401	'Trưởng phòng nội vụ'
482	'Trưởng phòng Pháp lý'	471	'Trường phòng Phòng kinh doanh'
273	'Trưởng phòng QA'	272	'Trưởng phòng QC'
477	'Trưởng phòng QLTK'	390	'Trưởng phòng QTTH'
402	'Trưởng phòng quản lý - Đô thị'	206	'Trưởng Phòng Tài Chính'
403	'Trưởng phòng Tài chính - Kế hoạch TP'	277	'Trưởng phòng TCKT'
575	'Trưởng phòng thi công'	211	'Trưởng Phòng Thương Mại & Cung Ứng'
355	'Trưởng phòng triển khai & CSKH'	175	'Trưởng phòng truyền thông'
424	'Trưởng phòng Tư vấn & CSKH'	142	'Trưởng phòng vật tư'
233	'Trưởng phòng Xuất nhập khẩu'	220	'Trưởng trung tâm'
439	'Truyền thông NB'	601	'Tư vấn giám sát'
158	'Tư vấn nghiệp vụ'	151	'Tư vấn thiết kế'
392	'Vận hành'	306	'Văn thư'
341	'Văn thư'	261	'Vị trí'
651	'vị trí cộng tác viên'	297	'VNA||Phòng CSKH'
296	'VNA||Phòng KD||Phòng KDHCM'	294	'VNA||Phòng KD||Phòng KDHN||Phòng KDHN1'
295	'VNA||Phòng KD||Phòng KDHN||Phòng KDHN2'	293	'VNA||Phòng Marketing'
email	email	false	Email
Ví dụ: name@company.com
date_created	date	false	Ngày tạo
Định dạng dd/mm/YYYY
date_active	date	false	Ngày kích hoạt
Định dạng dd/mm/YYYY
profile_date_updated	date	false	Ngày cập nhật
Định dạng dd/mm/YYYY
date_login	date	false	Đăng nhập lần cuối
Định dạng dd/mm/YYYY
admin_user_role	string	false	Vai trò người dùng
Thuộc 1 trong các giá trị sau:(Sử dụng cột Giá trị, nếu cấu hình field_raws hãy sử dụng cột ID)
ID	Giá trị
SYSTEM	'admin.user.enum.admin_user_role.system'
COMPANY	'admin.user.enum.admin_user_role.company'
BRANCH	'admin.user.enum.admin_user_role.branch'
DEPARTMENT	'admin.user.enum.admin_user_role.department'
date_created_from	date	false	Từ ngày tạo
Định dạng dd/mm/YYYY
date_created_to	date	false	Đến ngày tạo
Định dạng dd/mm/YYYY
date_active_from	date	false	Từ ngày kích hoạt
Định dạng dd/mm/YYYY
date_active_to	date	false	Đến ngày kích hoạt
Định dạng dd/mm/YYYY
profile_date_updated_from	date	false	Từ ngày cập nhật
Định dạng dd/mm/YYYY
profile_date_updated_to	date	false	Đến ngày cập nhật
Định dạng dd/mm/YYYY
date_login_from	date	false	Từ đăng nhập lần cuối
Định dạng dd/mm/YYYY
date_login_to	date	false	Đến đăng nhập lần cuối
Định dạng dd/mm/YYYY
GET/api/admin/user/item
Chi tiết tài khoản người dùng
Field	Type	Required	Description
access_token*	string	true	Mã bảo mật
hl	string	false	Ngôn ngữ sử dụng
Thuộc 1 trong các giá trị sau: 'vn', 'en'. Mặc định là: 'vn'
field_raws	string	false	Danh sách trường dữ liệu nhận dữ liệu raw
Các trường cách nhau bởi dấu ",". Sử dụng "allfield" nếu muốn tất cả các trường đều nhận dữ liệu raw. Ví dụ: field_1,field_2,products, products.title, products.price...
id*	integer	true	Id đối tượng cần lấy thông tin
POST/api/admin/user/insert
Tạo mới tài khoản người dùng
Field	Type	Required	Description
access_token*	string	true	Mã bảo mật
hl	string	false	Ngôn ngữ sử dụng
Thuộc 1 trong các giá trị sau: 'vn', 'en'. Mặc định là: 'vn'
field_raws	string	false	Danh sách trường dữ liệu nhận dữ liệu raw
Các trường cách nhau bởi dấu ",". Sử dụng "allfield" nếu muốn tất cả các trường đều nhận dữ liệu raw. Ví dụ: field_1,field_2,products, products.title, products.price...
username*	string	true	Tài khoản
fullname	string	false	Họ tên
group_id*	string	true	Nhóm
Thuộc 1 trong các giá trị sau:(Sử dụng cột Giá trị, nếu cấu hình field_raws hãy sử dụng cột ID)
ID	Giá trị	ID	Giá trị
123	'(Liberico) Ban Giám đốc'	125	'(Liberico) Nhân viên'
124	'(Liberico) Nhóm trưởng phòng'	95	'[Agribank] Nhóm quyền Giám đốc'
97	'[Agribank] Nhóm quyền Nhân viên'	96	'[Agribank] Nhóm quyền Trưởng phòng'
116	'[GTV] Nhóm nhân viên xây dựng'	129	'[HTN] Giám đốc'
140	'[Lê Lai] NV'	139	'[Lê Lai] TP'
145	'[Nhân viên]'	113	'[RC8] Ban lãnh đạo'
115	'[RC8] Nhân viên'	114	'[RC8] Quản lý'
119	'[TN] Admin'	146	'A'
149	'abc'	57	'ADMIN'
35	'Ban Giám đốc'	101	'Ban Giám đốc Thiên Dương'
103	'BLĐ _ABC'	134	'CƯỜNG TUẤN PHÁT'
89	'ĐIỀU HÀNH - TLR'	64	'Full quyền admin'
104	'GĐ thiết kế/thi công -ABC'	121	'GEC admin'
122	'GEC nhân viên'	88	'HDQT - TLR'
138	'HOÀNG VĂN MƯỜI HAI'	75	'IP - GIÁM ĐỐC'
77	'IP - NHÂN VIÊN KINH DOANH'	76	'IP - TRUONG PHONG KINH DOANH 1'
127	'KD5- Enterprise'	132	'KD5- Work'
85	'KẾ TOÁN NYNHI'	84	'KẾ TOÁN TRƯỞNG NYNHI'
120	'KEYENCE'	92	'KHỐI HÀNH CHÍNH_NHÂN SỰ - TLR'
90	'KHỐI KINH DOANH - TLR'	91	'KHỐI TÀI CHÍNH - TLR'
117	'MAC_Admin'	118	'MAC_Nhân viên'
128	'Mây'	86	'MELMEL ACADEMY'
144	'Nhân sự luantn'	47	'Nhân viên - c1'
51	'Nhân viên 2022'	37	'Nhân viên HCNS'
40	'Nhân viên kế toán -ABC'	36	'Nhân viên Kinh doanh'
41	'Nhân viên thiết kế'	105	'Nhân viên thiết kế/thi công -ABC'
107	'Nhân viên tư vấn -ABC'	72	'Nhân viên UCA'
151	'Nhóm AAAAAAA'	21	'Nhóm admin'
126	'Nhóm admin - CDP'	87	'Nhóm admin - TLR'
150	'Nhóm best'	133	'Nhóm Bluezone'
93	'NHÓM CHỈ DÙNG TUYỂN DỤNG'	44	'Nhóm Chuyên viên kinh doanh cao cấp'
45	'Nhóm CRM + Công việc '	152	'Nhóm FULL quyền'
52	'Nhóm full quyền quản lý'	71	'Nhóm Lãnh đạo UCA'
61	'nhóm linh tester'	143	'NHÓM MUA BÁN'
131	'Nhóm quản trị'	142	'Nhóm quản trị hệ thống'
56	'Nhóm test'	59	'Nhóm test farmer'
147	'Nhóm test quyền lịch họp'	53	'Nhóm test thanh toán trả sau'
49	'nhóm test1'	63	'Nhóm trả sau 1'
43	'Nhóm trưởng phòng'	74	'Nhóm Trưởng phòng kinh doanh'
48	'NHÓM VĂN PHÒNG'	73	'Nhóm Vinacontrol'
60	'nhóm xài hết combo'	136	'NV - ĐẠI XƯƠNG THẠNH'
81	'NV HCSN NYNHI'	110	'NV HCSN-ABC'
111	'NV marketing -ABC'	78	'NV Song huyền'
83	'NVKD NYNHI'	79	'NYNHI BAN GIÁM ĐỐC'
38	'Phòng Khảo Sát'	137	'Phúc Đỉnh'
135	'QL - ĐẠI XƯƠNG THẠNH'	130	'Quản lý'
46	'Tài khoản Viettel Post'	94	'TD nhóm Nippovina'
148	'Test lịch biểu'	54	'Test nhóm người dùng TT sau 1'
55	'Test thanh toán trả sau 2'	112	'TP marketing -ABC'
108	'TP tài chính - kế toán - ABC'	106	'TP tư vấn - ABC'
39	'Trưởng phòng HCNS'	80	'TRƯỞNG PHÒNG HCNS NYNHI'
109	'Trưởng phòng HCNS-ABC'	82	'TRƯỞNG PHÒNG KD NYNHI'
42	'Trưởng phòng kinh doanh'	100	'VNPT Chi nhánh'
99	'VNPT Trụ sở chính'	98	'WPL'
inherit_roles	string	false	Tùy chỉnh quyền
Thuộc 1 trong các giá trị sau:(Sử dụng cột Giá trị, nếu cấu hình field_raws hãy sử dụng cột ID)
ID	Giá trị
yes	'Không'	Mặc định
no	'Có'	
is_admin	string	false	Quản trị hệ thống
Thuộc 1 trong các giá trị sau:(Sử dụng cột Giá trị, nếu cấu hình field_raws hãy sử dụng cột ID)
ID	Giá trị
yes	'admin.user.enum.is_admin.yes'	
no	'admin.user.enum.is_admin.no'	Mặc định
password	password	false	Mật khẩu
email	email	false	Email
Ví dụ: name@company.com
admin_user_role	string	false	Vai trò người dùng
Thuộc 1 trong các giá trị sau:(Sử dụng cột Giá trị, nếu cấu hình field_raws hãy sử dụng cột ID)
ID	Giá trị
SYSTEM	'admin.user.enum.admin_user_role.system'
COMPANY	'admin.user.enum.admin_user_role.company'
BRANCH	'admin.user.enum.admin_user_role.branch'
DEPARTMENT	'admin.user.enum.admin_user_role.department'
account_type	string	false	Loại tài khoản
POST/api/admin/user/update
Cập nhật tài khoản người dùng
Field	Type	Required	Description
access_token*	string	true	Mã bảo mật
hl	string	false	Ngôn ngữ sử dụng
Thuộc 1 trong các giá trị sau: 'vn', 'en'. Mặc định là: 'vn'
field_raws	string	false	Danh sách trường dữ liệu nhận dữ liệu raw
Các trường cách nhau bởi dấu ",". Sử dụng "allfield" nếu muốn tất cả các trường đều nhận dữ liệu raw. Ví dụ: field_1,field_2,products, products.title, products.price...
username	string	false	Tài khoản
fullname	string	false	Họ tên
group_id	string	false	Nhóm
Thuộc 1 trong các giá trị sau:(Sử dụng cột Giá trị, nếu cấu hình field_raws hãy sử dụng cột ID)
ID	Giá trị	ID	Giá trị
123	'(Liberico) Ban Giám đốc'	125	'(Liberico) Nhân viên'
124	'(Liberico) Nhóm trưởng phòng'	95	'[Agribank] Nhóm quyền Giám đốc'
97	'[Agribank] Nhóm quyền Nhân viên'	96	'[Agribank] Nhóm quyền Trưởng phòng'
116	'[GTV] Nhóm nhân viên xây dựng'	129	'[HTN] Giám đốc'
140	'[Lê Lai] NV'	139	'[Lê Lai] TP'
145	'[Nhân viên]'	113	'[RC8] Ban lãnh đạo'
115	'[RC8] Nhân viên'	114	'[RC8] Quản lý'
119	'[TN] Admin'	146	'A'
149	'abc'	57	'ADMIN'
35	'Ban Giám đốc'	101	'Ban Giám đốc Thiên Dương'
103	'BLĐ _ABC'	134	'CƯỜNG TUẤN PHÁT'
89	'ĐIỀU HÀNH - TLR'	64	'Full quyền admin'
104	'GĐ thiết kế/thi công -ABC'	121	'GEC admin'
122	'GEC nhân viên'	88	'HDQT - TLR'
138	'HOÀNG VĂN MƯỜI HAI'	75	'IP - GIÁM ĐỐC'
77	'IP - NHÂN VIÊN KINH DOANH'	76	'IP - TRUONG PHONG KINH DOANH 1'
127	'KD5- Enterprise'	132	'KD5- Work'
85	'KẾ TOÁN NYNHI'	84	'KẾ TOÁN TRƯỞNG NYNHI'
120	'KEYENCE'	92	'KHỐI HÀNH CHÍNH_NHÂN SỰ - TLR'
90	'KHỐI KINH DOANH - TLR'	91	'KHỐI TÀI CHÍNH - TLR'
117	'MAC_Admin'	118	'MAC_Nhân viên'
128	'Mây'	86	'MELMEL ACADEMY'
144	'Nhân sự luantn'	47	'Nhân viên - c1'
51	'Nhân viên 2022'	37	'Nhân viên HCNS'
40	'Nhân viên kế toán -ABC'	36	'Nhân viên Kinh doanh'
41	'Nhân viên thiết kế'	105	'Nhân viên thiết kế/thi công -ABC'
107	'Nhân viên tư vấn -ABC'	72	'Nhân viên UCA'
151	'Nhóm AAAAAAA'	21	'Nhóm admin'
126	'Nhóm admin - CDP'	87	'Nhóm admin - TLR'
150	'Nhóm best'	133	'Nhóm Bluezone'
93	'NHÓM CHỈ DÙNG TUYỂN DỤNG'	44	'Nhóm Chuyên viên kinh doanh cao cấp'
45	'Nhóm CRM + Công việc '	152	'Nhóm FULL quyền'
52	'Nhóm full quyền quản lý'	71	'Nhóm Lãnh đạo UCA'
61	'nhóm linh tester'	143	'NHÓM MUA BÁN'
131	'Nhóm quản trị'	142	'Nhóm quản trị hệ thống'
56	'Nhóm test'	59	'Nhóm test farmer'
147	'Nhóm test quyền lịch họp'	53	'Nhóm test thanh toán trả sau'
49	'nhóm test1'	63	'Nhóm trả sau 1'
43	'Nhóm trưởng phòng'	74	'Nhóm Trưởng phòng kinh doanh'
48	'NHÓM VĂN PHÒNG'	73	'Nhóm Vinacontrol'
60	'nhóm xài hết combo'	136	'NV - ĐẠI XƯƠNG THẠNH'
81	'NV HCSN NYNHI'	110	'NV HCSN-ABC'
111	'NV marketing -ABC'	78	'NV Song huyền'
83	'NVKD NYNHI'	79	'NYNHI BAN GIÁM ĐỐC'
38	'Phòng Khảo Sát'	137	'Phúc Đỉnh'
135	'QL - ĐẠI XƯƠNG THẠNH'	130	'Quản lý'
46	'Tài khoản Viettel Post'	94	'TD nhóm Nippovina'
148	'Test lịch biểu'	54	'Test nhóm người dùng TT sau 1'
55	'Test thanh toán trả sau 2'	112	'TP marketing -ABC'
108	'TP tài chính - kế toán - ABC'	106	'TP tư vấn - ABC'
39	'Trưởng phòng HCNS'	80	'TRƯỞNG PHÒNG HCNS NYNHI'
109	'Trưởng phòng HCNS-ABC'	82	'TRƯỞNG PHÒNG KD NYNHI'
42	'Trưởng phòng kinh doanh'	100	'VNPT Chi nhánh'
99	'VNPT Trụ sở chính'	98	'WPL'
inherit_roles	string	false	Tùy chỉnh quyền
Thuộc 1 trong các giá trị sau:(Sử dụng cột Giá trị, nếu cấu hình field_raws hãy sử dụng cột ID)
ID	Giá trị
yes	'Không'	Mặc định
no	'Có'	
is_admin	string	false	Quản trị hệ thống
Thuộc 1 trong các giá trị sau:(Sử dụng cột Giá trị, nếu cấu hình field_raws hãy sử dụng cột ID)
ID	Giá trị
yes	'admin.user.enum.is_admin.yes'	
no	'admin.user.enum.is_admin.no'	Mặc định
password	password	false	Mật khẩu
email	email	false	Email
Ví dụ: name@company.com
admin_user_role	string	false	Vai trò người dùng
Thuộc 1 trong các giá trị sau:(Sử dụng cột Giá trị, nếu cấu hình field_raws hãy sử dụng cột ID)
ID	Giá trị
SYSTEM	'admin.user.enum.admin_user_role.system'
COMPANY	'admin.user.enum.admin_user_role.company'
BRANCH	'admin.user.enum.admin_user_role.branch'
DEPARTMENT	'admin.user.enum.admin_user_role.department'
account_type	string	false	Loại tài khoản
POST/api/admin/user/delete
Xóa tài khoản người dùng
Field	Type	Required	Description
access_token*	string	true	Mã bảo mật
delIds*	string comma	true	Danh sách id cần xóa
Là 1 chuỗi giá trị phân cách bởi dấu phẩy. Ví dụ '1,2,3' hoặc 'a,b,c '...
